# Owner to-do before submission

Things only the repo owner can do: accounts, secrets, decisions and the video. Submission closes Nov 12, 2026 (one listing says Nov 13, 1:30 AM IST, which is Nov 12, 20:00 UTC; check Devpost). Delete this file before submitting if you'd rather judges didn't see it.

## Repo and hosting

- [ ] Merge `feat/shoal-build` into `main` (through a pull request) and keep `main` the default branch. Judges land on `main`, and GitHub only runs the CI and keep-alive workflows from the default branch.
- [ ] Add the repository secret `BRYNTUM_NPM_TOKEN` (Settings > Secrets and variables > Actions) so CI can install Bryntum. Same token as on Render.
- [ ] Make a dedicated PayPal sandbox personal account for visitors. On Render set `NEXT_PUBLIC_SANDBOX_BUYER_EMAIL` and `NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD`, then redeploy (they're read at build time). This login is public: never a real account.
- [ ] Set daily spend limits on the Anthropic, Gemini and Channel3 keys. The app throttles each client, but only a provider limit caps the total.
- [ ] After the merge, check the Actions tab: "Keep demo awake" runs every 10 minutes and CI is green.
- [ ] Optional: a paid always-on Render instance for the judging window (Nov 12 to Dec 21) instead of relying on the keep-alive ping.

## Decisions

- [ ] Negotiation economics (review P1 #6): (a) the supplier sets an explicit concession policy that its agent applies, or (b) a quantity agent asks shops to top up to reach the next tier. Pick one, or keep it as it is.

## Check the hosted demo by hand

- [ ] Receipts round: join for real with the sandbox buyer, negotiate, close, open the invoice, ship, file a claim, approve it, deliver all, release the holdback.
- [ ] In the Shoal sandbox account's PayPal Activity, confirm the payment shows the authorized amount and the smaller captured amount (beat 4 of the video shows this).
- [ ] Oat milk round: join alone with 96 cartons, close, and confirm PayPal shows the authorization voided (beat 6).
- [ ] Open the demo in two browsers and confirm each has its own rounds.

## Video and Devpost

- [ ] Record from `docs/demo-script.md` (2:55, under the 3:00 limit): no music, no third-party trademarks, one browser profile throughout.
- [ ] Devpost entry: repo link (to `main`), live demo URL, video, sponsor tools used, and testing instructions with the sandbox buyer login.
- [ ] Optional: ask two or three real suppliers or shops for a quote you may use, with permission. Never invent one.
