// Drives the Shoal demo in Chrome and records it, following docs/demo-script.md.
//   node record.mjs login    one-time: sign in to the PayPal sandbox yourself in both profiles
//   node record.mjs prep     reset the demo, simulate shops, set up the failing oat-milk round (not recorded)
//   node record.mjs record   record all beats into recordings/ with markers.json
import {chromium} from 'playwright';
import fs from 'node:fs';

const BASE = process.env.SHOAL_URL || 'http://localhost:3000';
const PP = 'https://www.sandbox.paypal.com';
const VIEW = {width: 1440, height: 900};
const mode = process.argv[2];

const launch = (profile, video) =>
  chromium.launchPersistentContext(`profiles/${profile}`, {
    channel: 'chrome',
    headless: false,
    viewport: VIEW,
    acceptDownloads: true,
    ...(video && {recordVideo: {dir: 'recordings/raw', size: VIEW}}),
  });

// Playwright videos have no cursor: draw one so "point at" reads on screen.
const CURSOR = `(() => { if (window.__cur) return; window.__cur = 1;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(224,20,111,.35);border:2px solid #e0146f;transition:transform .12s;left:-50px;top:-50px';
  const add = () => document.body && !d.isConnected && document.body.appendChild(d);
  addEventListener('mousemove', (e) => { add(); d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => d.style.transform = 'scale(.7)', true);
  addEventListener('mouseup', () => d.style.transform = '', true);
})()`;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Pointing is best effort: a missing element is logged, never fatal, so one miss can't sink a take.
async function point(page, loc, hold = 1200) {
  await loc.scrollIntoViewIfNeeded({timeout: 5000}).catch(() => {});
  const b = await loc.boundingBox({timeout: 5000}).catch(() => console.log('!! not found:', String(loc)));
  if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {steps: 25});
  await pause(hold);
}
async function click(page, loc, hold = 600) {
  await point(page, loc, 300);
  await loc.click({timeout: 10000}).catch(() => console.log('!! could not click:', String(loc)));
  await pause(hold);
}
async function scrollTo(page, loc) {
  await loc.evaluate((el) => el.scrollIntoView({behavior: 'smooth', block: 'center'}), null, {timeout: 5000}).catch(() => console.log('!! not found:', String(loc)));
  await pause(900);
}

// The PayPal button opens a popup. PayPal asks for the buyer password there: the person at the
// keyboard types it (never this script), and that wait is cut from the edit.
async function approvePayPal(page, onPopup, cut = (fn) => fn()) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), click(page, page.locator('paypal-button').first(), 0)]);
  onPopup?.(popup);
  await popup.waitForLoadState('domcontentloaded');
  await popup.addInitScript(CURSOR).catch(() => {});
  const go = popup.getByRole('button', {name: /^(Continue|Continue to Review Order|Agree & Continue|Pay Now)$/i}).first();
  const login = popup.getByRole('button', {name: 'Log In'});
  await Promise.race([go.waitFor({timeout: 60000}), login.waitFor({timeout: 60000})]);
  if (!(await go.isVisible())) {
    // Not the NEXT_PUBLIC_ names: the app would print those on the join panel, on camera.
    const {DEMO_BUYER_EMAIL: email, DEMO_BUYER_PASSWORD: password} = process.env;
    await cut(async () => {
      if (password) {
        // Sandbox test buyer from .env.local; never logged.
        const emailField = popup.getByLabel(/Email or mobile/i);
        if (email && !(await emailField.inputValue().catch(() => ''))) await emailField.fill(email);
        const pw = popup.getByLabel(/^Password/i);
        if (!(await pw.isVisible())) await popup.getByRole('button', {name: /^Next$/}).click();
        await pw.fill(password);
        await login.click();
      } else {
        console.log('\a>>> Log in as the sandbox buyer in the PayPal popup now (waiting up to 5 minutes).');
      }
      await go.waitFor({timeout: 300000});
    });
  }
  await pause(1500);
  await go.click();
  await popup.waitForEvent('close', {timeout: 60000}).catch(() => {});
}

// Opens PayPal home in a profile, signing in with the sandbox test account from .env.local if PayPal asks.
async function paypalHome(page, email, password) {
  await page.goto(`${PP}/myaccount/summary`);
  await page.waitForLoadState('load').catch(() => {});
  if (!/signin|login/i.test(page.url()) || !password) return;
  const emailField = page.locator('#email');
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email);
    const next = page.locator('#btnNext');
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  await page.locator('#password').waitFor({timeout: 20000});
  await page.locator('#password').fill(password);
  await page.locator('#btnLogin').click();
  await page.waitForURL(/myaccount|mep\/dashboard/, {timeout: 60000}).catch(() => console.log('!! PayPal sign-in did not finish'));
}

// Reloads the supplier's PayPal home until Shoal's payout row is there (sandbox payouts lag a few minutes).
async function payoutRow(page, minutes = 5) {
  const row = page.getByRole('row').filter({hasText: 'Shoal Demo'}).first();
  for (const end = Date.now() + minutes * 60000; Date.now() < end; ) {
    await page.goto(`${PP}/myaccount/summary`);
    if (await row.waitFor({timeout: 15000}).then(() => true, () => false)) return row;
    await pause(10000);
  }
  throw new Error('payout never showed in the supplier PayPal');
}
async function showPayout(page) {
  const row = page.getByRole('row').filter({hasText: 'Shoal Demo'}).first();
  await scrollTo(page, row);
  await point(page, row.getByText('Shoal Demo'), 2000);
  await point(page, row.getByText(/\$\d[\d,]*\.\d\d USD/), 3000);
}

if (mode === 'pickup-payout') {
  // Re-shoots only the supplier's PayPal shot of the last take and splices it into recordings/markers.json.
  const m = JSON.parse(fs.readFileSync('recordings/markers.json', 'utf8'));
  const sup = await chromium.launchPersistentContext('profiles/paypal-supplier', {
    channel: 'chrome', headless: false, viewport: VIEW, recordVideo: {dir: 'recordings/raw', size: VIEW},
  });
  await sup.addInitScript(CURSOR);
  const t0 = Date.now();
  const page = sup.pages()[0] || (await sup.newPage());
  await paypalHome(page, process.env.DEMO_SUPPLIER_EMAIL, process.env.DEMO_SUPPLIER_PASSWORD);
  await payoutRow(page);
  const from = (Date.now() - t0) / 1000;
  await showPayout(page);
  const len = (Date.now() - t0) / 1000 - from;
  const video = page.video();
  await sup.close();
  const c = m.clips.find((x) => x.kind === 'supplier-paypal');
  Object.assign(c, {file: await video.path(), offset: c.start - from, end: c.start + len});
  fs.writeFileSync('recordings/markers.json', JSON.stringify(m, null, 2));
  console.log(`Spliced a ${len.toFixed(1)}s payout shot into the take.`);
} else if (mode === 'login') {
  // You sign in here, not the script: buyer (personal) in "shop", the Shoal business account in "paypal-biz".
  const shop = await launch('shop');
  await (shop.pages()[0] || (await shop.newPage())).goto(`${PP}/signin`);
  const biz = await launch('paypal-biz');
  await (biz.pages()[0] || (await biz.newPage())).goto(`${PP}/signin`);
  console.log('Sign in to the PayPal sandbox in both windows (buyer in the first, Shoal business in the second), then close both windows.');
  // Closing the last window doesn't quit Chrome on macOS, so wait on the pages and close the contexts ourselves.
  await Promise.all([shop, biz].map((c) => c.pages()[0].waitForEvent('close', {timeout: 0}).then(() => c.close())));
} else if (mode === 'prep') {
  const ctx = await launch('shop');
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(BASE);
  await page.getByRole('button', {name: 'Reset demo'}).first().click();
  await pause(3000);
  await page.goto(`${BASE}/supplier/receipts`);
  await pause(4000); // retail benchmark loads on first visit
  const sim = page.getByRole('button', {name: /^Simulate \d+ shops?/});
  if (await sim.count()) {
    await sim.first().click();
    await page.getByText(/8 shops/).first().waitFor({timeout: 30000}).catch(() => {});
  }
  // Failed-round beat: one shop with the 96-carton minimum, below the 500-carton first tier.
  await page.goto(`${BASE}/rounds/demo`);
  await page.getByLabel('Shop name').fill('Corner Café');
  await approvePayPal(page);
  await page.getByText(/You're in/).waitFor({timeout: 60000});
  console.log('Prep done.');
  await ctx.close();
} else if (mode === 'record') {
  fs.rmSync('recordings/raw', {recursive: true, force: true});
  const t0 = Date.now();
  const at = () => (Date.now() - t0) / 1000;
  const markers = {beats: [], cuts: [], clips: []};
  let cur;
  const beat = (id) => { if (cur) cur.end = at(); cur = {id, start: at()}; markers.beats.push(cur); console.log('beat', id, at().toFixed(1)); };
  // Long waits (agents thinking) are cut from the edit, keeping a second either side.
  const cut = async (fn) => {
    const s = at();
    await Promise.resolve().then(fn).catch((e) => console.log('!! wait failed:', e.message.split('\n')[0]));
    if (at() - s > 2.5) markers.cuts.push({start: s + 1, end: at() - 1});
  };
  // A clip's video starts when its page opens (offset); start can move later to skip loading.
  const clip = (kind, page) => { const c = {kind, start: at(), offset: at(), page}; markers.clips.push(c); page.on('close', () => (c.end = at())); return c; };

  const ctx = await launch('shop', true);
  await ctx.addInitScript(CURSOR);
  const page = ctx.pages()[0] || (await ctx.newPage());
  markers.mainOffset = at(); // the main video starts about when its window opened
  await page.evaluate(CURSOR).catch(() => {});
  const biz = await launch('paypal-biz', true);
  await biz.addInitScript(CURSOR);
  const bizPage = biz.pages()[0] || (await biz.newPage());
  const bizT0 = at();
  await paypalHome(bizPage, process.env.DEMO_SHOAL_EMAIL, process.env.DEMO_SHOAL_PASSWORD);
  const sup = await launch('paypal-supplier', true);
  await sup.addInitScript(CURSOR);
  const supPage = sup.pages()[0] || (await sup.newPage());
  const supT0 = at();
  await paypalHome(supPage, process.env.DEMO_SUPPLIER_EMAIL, process.env.DEMO_SUPPLIER_PASSWORD);
  await page.bringToFront();

  // 1. Problem
  await page.goto(BASE);
  await pause(800);
  beat('1-problem');
  await pause(3000);
  await scrollTo(page, page.getByText('How a round works').first());
  await pause(4000);

  // 2. Join
  await page.goto(`${BASE}/rounds/receipts`);
  beat('2-join');
  await pause(1000);
  for (const p of ['$1.43', '$1.28', '$1.13', '$1.02']) await point(page, page.getByText(p, {exact: true}).first(), 700);
  const sources = page.getByText('Sources', {exact: true});
  if (await sources.count()) await click(page, sources.first(), 2000);
  await scrollTo(page, page.getByLabel('Shop name'));
  await click(page, page.getByLabel('Shop name'), 200);
  await page.getByLabel('Shop name').fill(''); // the field starts as "Your shop"
  await page.getByLabel('Shop name').pressSequentially('Harbor Books', {delay: 70});
  await point(page, page.getByText(/We.ll reserve/), 2500);
  await approvePayPal(page, (p) => clip('paypal-approve', p), cut);
  await point(page, page.getByText(/You're in/).first(), 3000);

  // 3. Negotiate
  await page.goto(`${BASE}/supplier/receipts`);
  beat('3-negotiate');
  await pause(1500);
  await click(page, page.getByRole('button', {name: /^Negotiate/}), 1500);
  await point(page, page.getByText(/Within 10% of the next tier/).first(), 2500);
  await point(page, page.getByText('Every offer checked against supplier rules').first(), 1500);
  await cut(() => page.getByText(/Blocked by the rules/).first().waitFor({timeout: 120000}).catch(() => {}));
  await point(page, page.getByText(/Blocked by the rules/).first(), 2500);
  await cut(() => page.getByText(/Agreed at|No deal/).first().waitFor({timeout: 180000}));
  await point(page, page.getByText(/Agreed at|No deal/).first(), 3500);

  // 4. Close
  beat('4-close');
  await click(page, page.getByRole('button', {name: 'Close round'}), 0);
  await cut(() => page.getByText(/Round closed at/).first().waitFor({timeout: 120000}));
  await pause(1500);
  await page.goto(`${BASE}/rounds/receipts`);
  await pause(1000);
  await point(page, page.getByText('Your receipt').first(), 1500);
  for (const t of ['Reserved', 'Never taken', 'You saved']) await point(page, page.getByText(t, {exact: true}).first(), 1500);
  // The narration quotes this take's numbers (see voiceover.json placeholders).
  const dd = (term) => page.locator('dt', {hasText: term}).first().locator('xpath=following-sibling::dd[1]').textContent({timeout: 5000}).catch(() => null);
  markers.numbers = {
    reserved: await dd('Reserved'), neverTaken: await dd('Never taken'), alone: await dd("Alone you'd pay"), saved: await dd('You saved'),
    retail: (await page.getByText(/Retail elsewhere ≈ \$[\d.]+/).first().textContent({timeout: 5000}).catch(() => ''))?.match(/\$[\d.]+/)?.[0],
  };
  console.log('numbers', markers.numbers);
  await point(page, page.getByText(/PayPal invoice SH-/).first(), 2000);
  const view = page.getByRole('link', {name: 'View'}).first();
  if (await view.count()) {
    const [inv] = await Promise.all([ctx.waitForEvent('page'), click(page, view, 0)]);
    const c = clip('invoice', inv);
    await inv.getByText(/Bill to/i).first().waitFor({timeout: 20000}).catch(() => {});
    await pause(800);
    c.start = at();
    await point(inv, inv.getByText(/^Paid$/).first(), 2500);
    await point(inv, inv.getByText(/Thermal receipt paper/).first(), 2000);
    await inv.close();
  }
  await bizPage.bringToFront();
  await bizPage.reload();
  const paid = bizPage.getByText('Payment from').first();
  await paid.waitFor({timeout: 30000}).catch(() => {});
  await scrollTo(bizPage, paid);
  const bizClip = {kind: 'paypal-activity', start: at()};
  await point(bizPage, paid, 2000);
  await point(bizPage, bizPage.getByText(/\$\d+\.\d\d USD/).nth(1), 3000);
  bizClip.end = at();
  markers.clips.push(bizClip);
  await page.bringToFront();

  // 5. Fulfil
  await page.goto(`${BASE}/supplier/receipts`);
  beat('5-fulfil');
  await scrollTo(page, page.locator('.ag-root-wrapper').first());
  await pause(2000);
  await scrollTo(page, page.locator('.b-scheduler, .b-grid').first());
  await pause(2000);
  await click(page, page.getByRole('button', {name: 'Mark shipped'}), 0);
  await cut(() => page.getByText(/^Shipped\./).first().waitFor({timeout: 120000}));
  await point(page, page.getByText(/^Shipped\./).first(), 2000);
  // Brightline's own PayPal: the payout landing. Sandbox payouts show up after a delay, so that wait is cut.
  await supPage.bringToFront();
  await cut(() => payoutRow(supPage));
  const supClip = {kind: 'supplier-paypal', start: at(), offset: supT0};
  await showPayout(supPage);
  supClip.end = at();
  markers.clips.push(supClip);
  await page.bringToFront();
  await page.goto(`${BASE}/rounds/receipts`);
  await click(page, page.getByRole('button', {name: 'Report a problem'}), 800);
  await click(page, page.getByLabel(/Damaged/), 300);
  await page.getByLabel(/affected/).fill('5');
  await page.getByLabel(/What happened/).pressSequentially('Five rolls arrived crushed and water-damaged in the box; the paper tears in the printer.', {delay: 25});
  if (process.env.DEMO_PHOTO) await page.locator('input[type=file]').setInputFiles(process.env.DEMO_PHOTO);
  await pause(800);
  await click(page, page.getByRole('button', {name: 'Send report'}), 0);
  await cut(() => page.getByText(/Proposed refund|No refund proposed/).first().waitFor({timeout: 120000}));
  await pause(2500);
  await page.goto(`${BASE}/supplier/receipts`);
  const approve = page.getByRole('button', {name: /^Approve .*refund|^Approve, no refund/});
  await click(page, approve.first(), 0);
  await cut(() => page.getByText(/^Approved/).first().waitFor({timeout: 120000}));
  await point(page, page.getByText('Refunded').first(), 2000);
  await click(page, page.getByRole('button', {name: /Export purchase order/}), 2000);

  // 6. A round that fails
  await page.goto(`${BASE}/supplier/demo`);
  beat('6-fail');
  await pause(1000);
  await point(page, page.getByText(/the round fails and every reservation is released/).first(), 2000);
  await click(page, page.getByRole('button', {name: 'Close round'}), 0);
  await cut(() => page.getByText(/Every reservation was released/).first().waitFor({timeout: 120000}));
  await point(page, page.getByText(/Every reservation was released/).first(), 3000);

  // 7. Why PayPal
  await page.goto(BASE);
  beat('7-why');
  await pause(1000);
  await scrollTo(page, page.getByText(/Built with PayPal/).first());
  await pause(6000);
  cur.end = at();

  const mainVideo = page.video();
  for (const c of markers.clips) if (c.page) { c.file = await c.page.video()?.path(); delete c.page; }
  bizClip.file = await bizPage.video()?.path();
  bizClip.offset = bizT0; // the biz video starts when its window opened
  markers.clips.find((c) => c.kind === 'supplier-paypal').file = await supPage.video()?.path();
  await ctx.close();
  await biz.close();
  await sup.close();
  markers.main = await mainVideo.path();
  fs.writeFileSync('recordings/markers.json', JSON.stringify(markers, null, 2));
  console.log('Recorded. Markers in recordings/markers.json');
} else {
  console.log('Usage: node record.mjs login|prep|record');
}
