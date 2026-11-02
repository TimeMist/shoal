# Shoal

[![CI](https://github.com/TimeMist/shoal/workflows/CI/badge.svg)](https://github.com/TimeMist/shoal/actions/workflows/ci.yml)

Shoal lets independent shops buy supplies together, so they pay closer to what chains pay. Shops join a short buying round, PayPal reserves each shop's money, and when the round closes each shop pays only the price the group reached.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). Live demo (PayPal sandbox): https://shoal-m7zz.onrender.com

**Try it:** open the live demo; your browser gets its own copy of both rounds, so nobody else's clicks change yours. On the shop page, pay with the PayPal sandbox buyer login shown under the PayPal button (test money only).

## Money flow

```
Shop joins a round
  │  quote: goods at the price showing now + delivery (per drop + per unit), signed
  ▼
PayPal authorization for goods + delivery ── reserved, not charged
  │
  ▼
Round closes
  ├─ reached a tier ──► capture each shop at the group price (never more than reserved)
  │                       │
  │                       ▼
  │                     PayPal invoice in the supplier's name, recorded as paid
  │
  └─ missed the first tier ──► void every authorization, nothing charged
  ▼
Supplier marks shipped ──► PayPal Payout of 90% to the supplier, 10% held back
  │
  ▼
Shop reports a problem ──► refund from the holdback, recorded on that shop's invoice
  │
  ▼
Every order delivered or resolved ──► rest of the holdback paid out to the supplier
```

## What AI does, and what code decides

AI does three jobs:

- **Negotiation.** One agent speaks for the shops and one for the supplier. Each side runs on Claude or Gemini, set by `SHOP_AGENT_PROVIDER` and `SUPPLIER_AGENT_PROVIDER` (`claude` or `gemini`). They have 8 turns between them to agree a price below the current tier. The supplier's concession policy is published, so the shop agent knows the floor; it opens one offer just under it to test it, the guard rejects that offer, and the agents settle between the floor and the tier price. A reply that makes no move is asked once more before the turn is lost, and if Gemini is overloaded, Claude makes that move and the turn says so.
- **Claim triage.** When a shop reports missing, damaged or short goods, Claude reads the report (and photo, if any) and proposes how many units to refund. A person approves or rejects it on the supplier console.
- **Pack sizing for the retail benchmark.** Claude reads Channel3 offers and says whether each is the same product and how many units are in the pack. It never supplies a price.

Code in `lib/` decides every amount:

- `lib/guard.ts` checks every offer against the supplier's tiers and its concession policy: within 10% of the next tier's volume, the supplier gives up to half the price gap to it, and never goes under its absolute floor. Further from the next tier there's nothing to negotiate. An offer outside the policy is rejected, whatever the agent says.
- `lib/round.ts` computes reservations, delivery, captures and savings in integer cents. A capture never exceeds the reservation.
- `lib/settle.ts` splits payouts and clamps each refund to what the shop paid for goods and what's still held. `lib/agents/triage.ts` turns the proposed units into cents and never refunds more units than were claimed.
- `lib/benchmark.ts` turns offers into a per-unit price and takes the median. Fewer than 3 usable offers means no benchmark.
- `lib/deal.ts` signs quotes and deals so a price can't change between the screen and PayPal.

## The two demo rounds

Both rounds use the same 8 demo shops, labelled as demo data.

| Round | Supplier | Tiers | Delivery | Demo shops | Retail benchmark |
|---|---|---|---|---|---|
| Barista oat milk, 1 L carton (`/rounds/demo`) | Meadow Oat Co. | $2.40 alone · 500+ $2.16 · 1,000+ $1.92 · 1,500+ $1.80 | $12.00 per drop + $0.05 a carton | 1,440 cartons, $1.92 | None: Channel3 doesn't stock oat milk, and the console says so |
| Thermal receipt paper, 3⅛″ × 230′ roll (`/rounds/receipts`) | Brightline Paper Co. | $1.43 alone · 400+ $1.28 · 800+ $1.13 · 1,200+ $1.02 | $9.00 per drop + $0.02 a roll | 1,100 rolls, $1.13 | The current Channel3 median, with sources (≈ $1.43 a roll on Oct 31) |

Oat milk sells in packs of 12 (minimum 96 a shop); receipt rolls in packs of 50 (minimum 50). The lowest tier price is the supplier's absolute floor. Both suppliers' concession policy: within 10% of the next tier, up to 50% of the price gap (receipts at 1,150 rolls: between $1.08 and $1.13).

Verified end to end on the hosted demo, against the PayPal sandbox, on 2026-10-31:

- **Receipts round** (8 simulated shops + one real shop with 50 rolls): $66.50 reserved; agreed at $1.08; $64.00 captured ($54.00 goods + $10.00 delivery, $2.50 never taken); PayPal invoice issued in Brightline Paper Co.'s name and recorded as paid; $57.60 paid out at shipping; a claim for 5 damaged rolls refunded $5.40 from the holdback and recorded on the invoice; the remaining $1.00 holdback paid out. The buyer's and supplier's PayPal activity show the same amounts.
- **Oat milk round** (one real shop with 96 cartons, below the 500-carton first tier): the round failed and PayPal shows the $247.20 authorization voided.

## Run it locally

You need Node 24 and a free Bryntum trial login (for `@bryntum/scheduler-trial`, installed under the name `@bryntum/scheduler`). The repo's `.npmrc` already points the `@bryntum` scope at Bryntum's registry. Trying the hosted demo needs no Bryntum login.

1. Log in to Bryntum's npm registry with the trial login from Bryntum's trial instructions:

   ```bash
   npm login --registry=https://npm.bryntum.com
   ```

2. Install, configure and run:

   ```bash
   npm install
   cp .env.example .env.local   # then fill in the values (see Sandbox setup)
   npm run dev                  # http://localhost:3000
   npm test                     # money, guard, claims, invoices, benchmark and agent tests
   ```

CI (`.github/workflows/ci.yml`) runs lint, tests and the build on every push. It installs Bryntum with the repository secret `BRYNTUM_NPM_TOKEN`.

## Sandbox setup

1. **PayPal app.** At developer.paypal.com > Apps & Credentials (Sandbox), create an app and turn on **Payouts** and **Invoicing**. Put its client ID in `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and its secret in `PAYPAL_CLIENT_SECRET`.
2. **A buyer.** Under Testing Tools > Sandbox Accounts, use a **personal** account to join rounds through the PayPal button.
3. **The suppliers.** Create a **business** sandbox account for each round's supplier and put the emails in `SUPPLIER_PAYPAL_EMAIL_DEMO` (oat milk, Meadow Oat Co.) and `SUPPLIER_PAYPAL_EMAIL_RECEIPTS` (receipt rolls, Brightline Paper Co.). Each round's Payouts go to its own supplier. `SUPPLIER_PAYPAL_EMAIL` covers a round without its own address.

   Keep the roles apart: Shoal refuses a join paid with that round's supplier account.
   For a public demo, set `NEXT_PUBLIC_SANDBOX_BUYER_EMAIL` and `NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD` to a dedicated sandbox personal account: the shop page shows that login under the PayPal button. It's public, so never use a real account.
   The supplier console's **See it in PayPal** panel lists only logins a visitor can use: that buyer, and the round's supplier if you set `SANDBOX_SUPPLIER_PASSWORD` (give both supplier accounts that password; it's public too). Shoal's own account is never listed. PayPal's sandbox sign-in can't be pre-filled from a link, so each login has Copy buttons.

   | Role | Sandbox account | What you see in its PayPal activity |
   |---|---|---|
   | Shoal (platform) | the business account that owns the app (step 1) | shop payments captured, refunds, payouts sent, invoices issued |
   | Supplier | one business account per round (step 3) | payouts received |
   | Shop | a personal account (step 2) | its payment and its invoice |
4. **Secrets and agents.** Set `DEAL_SECRET` (`openssl rand -base64 32`), `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` if either side uses Gemini.
5. **Channel3.** Get a free-tier key at trychannel3.com and set `CHANNEL3_API_KEY`. Each lookup costs one credit; results are cached for 24 hours.
6. **Invoice emails.** Sandbox invoices don't reach a real inbox. Open them from the "View" link on the shop's receipt, or find the emails in the sandbox notifications in the PayPal developer dashboard.

## Demo walkthrough

This is the flow the demo video follows.

1. Click **Reset demo** in the top bar.
2. Open the supplier view once after every restart or deploy (`/supplier/receipts`), so the retail benchmark is loaded. Shop pages only read the cached benchmark; the supplier console runs the lookup. **Refresh retail** runs it again, at most once a minute.
3. On the supplier console, click **Simulate 8 shops** (the Shops picker beside it goes up to 10; 8 is the scripted demo). They join one at a time, about a second apart, and the price tiers step down to 1,100 rolls at $1.13.
4. Open `/rounds/receipts`. The ladder shows "Retail elsewhere ≈ …" (the current Channel3 median) and its Sources. Enter a shop name, keep 50 rolls and pay with the PayPal sandbox buyer. Shoal reserves $66.50 (goods $56.50 + delivery $10.00), not charged. This browser remembers which shop is yours, in any tab.
5. On the supplier console, click **Negotiate**. The two agents trade offers between the $1.13 tier and the $1.08 policy floor (1,150 rolls is within 10% of the 1,200 tier, so Brightline gives up to half the 11¢ gap); each offer is checked against the supplier's rules. The shops' opening offer of $1.06 is blocked by the rules. A negotiation usually takes 15–40 seconds; the turns appear as they happen.
6. Click **Close round**. Each shop is captured at the group price, and the real shop gets a PayPal invoice in Brightline Paper Co.'s name, marked paid. If an invoice fails, a **Retry invoice** step appears.
7. The allocation grid and timeline show each shop. Click **Mark shipped**: 90% goes out as a PayPal Payout and 10% is held back.
8. On the shop tab, click **Report a problem**, choose damaged rolls and send. The agent proposes a refund. On the supplier console, click **Approve**. PayPal refunds the shop from the holdback and the refund is recorded on its invoice.
9. Click **Export purchase order** for the CSV. Then **Mark all delivered** and **Release holdback**.

## Demo vs production

- **Shops are simulated**, apart from the one you join with. Demo shops get no PayPal order or invoice.
- **Payouts stand in for PayPal multiparty.** In the demo, Shoal's sandbox account collects the money and pays the supplier with Payouts. In production, shops would pay the supplier directly through multiparty, and Shoal would take a platform fee without holding funds.
- **Invoices come from the app's sandbox account** with the supplier's business name and the note "Issued by Shoal on behalf of …". In production, Shoal would call Invoicing for the connected supplier, so invoices come from the supplier's own PayPal account.
- **The store is in memory, one copy per browser.** A cookie gives each visitor their own rounds; **Reset demo** resets only yours. A restart resets everyone's, and only one instance can run. The hosted demo runs on Render's Starter instance, which doesn't sleep, so the demo resets only on a redeploy.
- **Rounds last three days** because PayPal honors an authorization for three days. Nothing closes a round on its own yet; in the demo you close it from the supplier console. Longer rounds in production would use saved payment methods (PayPal vault) and charge at close.
- **No webhooks yet.** Shoal reads PayPal's answer to each call. Production would also listen for authorization voided or expired and capture completed, so a round stays right if a browser closes mid-payment. If a capture or void fails at close, the supplier console offers **Retry capture** (or **Retry release**) before shipping.
- **Invoices show up as their own line in the buyer's PayPal activity.** Shoal records each invoice as paid, so next to the payment the buyer sees an "Invoice Received" line for the same amount. It's a record of the same payment, not a second charge: each shop has one PayPal capture, shown on its receipt.
- **There are no logins.** Within your own copy, the shop, invoice and purchase-order routes are open. Negotiation and claim triage are limited to one call per client every 30 and 15 seconds, so the hosted demo's model credits can't be drained.

## Sponsor tools

- **PayPal**: Orders and Payments (authorize, capture, void, refund), Payouts (supplier payout and holdback release), Invoicing (invoices in the supplier's name, payments and refunds recorded).
- **Anthropic Claude**: negotiation agent, claim triage, pack sizing.
- **Google Gemini**: negotiation agent, either side.
- **AG Grid**: the supplier's allocation grid and the purchase-order CSV export.
- **Bryntum Scheduler**: the round timeline, one lane per shop.
- **Channel3**: the retail benchmark.
- **Render**: hosting (`render.yaml`, one instance). Set `BRYNTUM_NPM_TOKEN` (the token from your `~/.npmrc` after `npm login`) and the `.env.example` values in the Render dashboard.

## Not built yet

PayPal multiparty, persistent storage and logins (see "Demo vs production").

## Demo video

`demo-video/` makes the video from the live app, so every number on screen is a real sandbox transaction. `record.mjs` drives Chrome with Playwright through the walkthrough above and logs timestamps and the receipt's amounts; `voiceover.json` is the script, filled in with those amounts; `tts.mjs` voices it with Gemini text-to-speech; `plan.mjs` cuts the footage to fit the voice; and Remotion (`src/`) renders it with burned-in subtitles. Fonts are Funnel Display and Funnel Sans (SIL Open Font License); there is no music.

```bash
cd demo-video && npm install
npm run prep && npm run record   # needs the app running and the DEMO_* sandbox logins in ../.env.local
npm run tts && node plan.mjs && npm run render   # out/shoal-demo.mp4
```

## License

MIT. See [LICENSE](LICENSE).
