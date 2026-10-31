# Owner to-do before submission

Things only the repo owner can do: accounts, secrets, decisions and the video. Submission closes Nov 12, 2026 (one listing says Nov 13, 1:30 AM IST, which is Nov 12, 20:00 UTC; check Devpost). Delete this file before submitting if you'd rather judges didn't see it.

## Repo and hosting

- [x] Merge `feat/shoal-build` into `main` (through a pull request) and keep `main` the default branch. Judges land on `main`, and GitHub only runs the CI and keep-alive workflows from the default branch.
- [x] Add the repository secret `BRYNTUM_NPM_TOKEN` (Settings > Secrets and variables > Actions) so CI can install Bryntum. Same token as on Render.
- [x] Make a dedicated PayPal sandbox personal account for visitors. On Render set `NEXT_PUBLIC_SANDBOX_BUYER_EMAIL` and `NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD`, then redeploy (they're read at build time). This login is public: never a real account.
- [x] Make one PayPal sandbox **business** account per supplier, e.g. `meadow-oat-demo@business.example.com` (business name "Meadow Oat Co. (demo)") and `brightline-paper-demo@business.example.com` ("Brightline Paper Co. (demo)"), both with the same password used nowhere else. On Render set `SUPPLIER_PAYPAL_EMAIL_DEMO`, `SUPPLIER_PAYPAL_EMAIL_RECEIPTS` and `SANDBOX_SUPPLIER_PASSWORD`, then delete `SHOAL_PAYPAL_EMAIL` and `SHOP_PAYPAL_EMAILS`, which nothing reads any more.
- [x] Rename the business name of the sandbox account that owns the app from "Test Store" to "Shoal (demo)" (it shows in every PayPal activity line and the invoice footer).
- [x] Rename the Brightline supplier account's business name from "Power Sandwitch" to "Brightline Paper Co. (demo)", and check the Meadow Oat account's name too.
- [x] Optional: in the public buyer account, accept the waiting $5,000 so payments come from its PayPal balance.
- [x] Decide on the buyer's two "−$64.00" activity lines (payment, plus the invoice Shoal records as paid): keep and explain, or stop recording invoice payments. Kept and explained in the README.
- [ ] Set daily spend limits on the Anthropic, Gemini and Channel3 keys. The app throttles each client, but only a provider limit caps the total.
- [ ] After the merge, check the Actions tab: "Keep demo awake" runs every 10 minutes and CI is green.
- [ ] Optional: a paid always-on Render instance for the judging window (Nov 12 to Dec 21) instead of relying on the keep-alive ping.

## Decisions

- [x] Negotiation economics (review P1 #6): chose the supplier concession policy (within 10% of the next tier, up to 50% of the gap). Built.
- [ ] Check the policy numbers suit the pitch: `concession` in `lib/seed.ts` (receipts at 1,150 rolls now negotiates between $1.08 and $1.13, not down to $1.02).

## Check the hosted demo by hand

- [x] Receipts round: join for real with the sandbox buyer, negotiate, close, open the invoice, ship, file a claim, approve it, deliver all, release the holdback.
- [x] In the Shoal sandbox account's PayPal Activity, the payment line shows the captured amount (the list doesn't show the authorized amount; beat 4 now pairs it with the receipt's Reserved figure). Switch that account's language to English (page footer) before recording.
- [x] Run **Negotiate** a few times: turns now run at effort `low` for speed. If offers get sloppy, delete the `effort: "low"` line in `lib/agents/negotiate.ts`.
- [x] Oat milk round: join alone with 96 cartons, close, and confirm PayPal shows the authorization voided (beat 6).
- [x] Open the demo in two browsers and confirm each has its own rounds.

## Video and Devpost

- [ ] Record from `docs/demo-script.md` (2:55, under the 3:00 limit): no music, no third-party trademarks, one browser profile throughout.
- [ ] Devpost entry: repo link (to `main`), live demo URL, video, sponsor tools used, and testing instructions with the sandbox buyer login.
- [ ] Optional: ask two or three real suppliers or shops for a quote you may use, with permission. Never invent one.
