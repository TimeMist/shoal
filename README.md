# Shoal

Shoal lets independent shops buy supplies together, so they pay closer to what chains pay. Shops join a short buying round, PayPal reserves each shop's money, and when the round closes each shop pays only the price the group reached.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). Live demo (PayPal sandbox): https://shoal-m7zz.onrender.com

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

- **Negotiation.** One agent speaks for the shops and one for the supplier. Each side runs on Claude or Gemini, set by `SHOP_AGENT_PROVIDER` and `SUPPLIER_AGENT_PROVIDER` (`claude` or `gemini`). They have 8 turns between them to agree a price below the current tier.
- **Claim triage.** When a shop reports missing, damaged or short goods, Claude reads the report (and photo, if any) and proposes how many units to refund. A person approves or rejects it on the supplier console.
- **Pack sizing for the retail benchmark.** Claude reads Channel3 offers and says whether each is the same product and how many units are in the pack. It never supplies a price.

Code in `lib/` decides every amount:

- `lib/guard.ts` checks every offer against the supplier's tiers and floor. An offer outside them is rejected, whatever the agent says.
- `lib/round.ts` computes reservations, delivery, captures and savings in integer cents. A capture never exceeds the reservation.
- `lib/settle.ts` splits payouts and clamps each refund to what the shop paid for goods and what's still held. `lib/agents/triage.ts` turns the proposed units into cents and never refunds more units than were claimed.
- `lib/benchmark.ts` turns offers into a per-unit price and takes the median. Fewer than 3 usable offers means no benchmark.
- `lib/deal.ts` signs quotes and deals so a price can't change between the screen and PayPal.

## The two demo rounds

Both rounds use the same 8 demo shops, labelled as demo data.

| Round | Supplier | Tiers | Delivery | Demo shops | Retail benchmark |
|---|---|---|---|---|---|
| Barista oat milk, 1 L carton (`/rounds/demo`) | Meadow Oat Co. | $2.40 alone · 500+ $2.16 · 1,000+ $1.92 · 1,500+ $1.80 | $12.00 per drop + $0.05 a carton | 1,440 cartons, $1.92 | None: Channel3 doesn't stock oat milk, and the console says so |
| Thermal receipt paper, 3⅛″ × 230′ roll (`/rounds/receipts`) | Brightline Paper Co. | $1.43 alone · 400+ $1.28 · 800+ $1.13 · 1,200+ $1.02 | $9.00 per drop + $0.02 a roll | 1,100 rolls, $1.13 | ≈ $1.50 a roll from Channel3, with sources |

Oat milk sells in packs of 12 (minimum 96 a shop); receipt rolls in packs of 50 (minimum 50). The lowest tier price is the supplier's floor.

Verified in the sandbox on 2026-10-26: in the receipts round, with no simulated shops, a real shop joined with 500 rolls, the round closed at $1.28, PayPal captured $659.00 ($640.00 goods + $19.00 delivery), and the PayPal invoice `SH-receipts-1-…` was sent and recorded as paid.

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

## Sandbox setup

1. **PayPal app.** At developer.paypal.com > Apps & Credentials (Sandbox), create an app and turn on **Payouts** and **Invoicing**. Put its client ID in `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and its secret in `PAYPAL_CLIENT_SECRET`.
2. **A buyer.** Under Testing Tools > Sandbox Accounts, use a **personal** account to join rounds through the PayPal button.
3. **A supplier.** Create a second **business** sandbox account and put its email in `SUPPLIER_PAYPAL_EMAIL`. Payouts go there.
4. **Secrets and agents.** Set `DEAL_SECRET` (`openssl rand -base64 32`), `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` if either side uses Gemini.
5. **Channel3.** Get a free-tier key at trychannel3.com and set `CHANNEL3_API_KEY`. Each lookup costs one credit; results are cached for 24 hours.
6. **Invoice emails.** Sandbox invoices don't reach a real inbox. Open them from the "View" link on the shop's receipt, or find the emails in the sandbox notifications in the PayPal developer dashboard.

## Demo walkthrough

This follows the video ([docs/demo-script.md](docs/demo-script.md)).

1. Click **Reset demo** in the top bar.
2. Open the supplier view once after every restart or deploy (`/supplier/receipts`), so the retail benchmark is loaded. Shop pages only read the cached benchmark; the supplier console runs the lookup. **Refresh retail** runs it again, at most once a minute.
3. On the supplier console, click **Simulate 8 shops**: 1,100 rolls at $1.13.
4. Open `/rounds/receipts`. The ladder shows "Retail elsewhere ≈ $1.50 a roll" and its Sources. Enter a shop name, keep 50 rolls and pay with the PayPal sandbox buyer. Shoal reserves $66.50 (goods $56.50 + delivery $10.00), not charged. Keep this tab open: it remembers which shop is yours.
5. On the supplier console, click **Negotiate**. The two agents trade offers between the $1.13 tier and the $1.02 floor; each offer is checked against the supplier's rules.
6. Click **Close round**. Each shop is captured at the group price, and the real shop gets a PayPal invoice in Brightline Paper Co.'s name, marked paid. If an invoice fails, **Issue invoices** retries it.
7. The allocation grid and timeline show each shop. Click **Mark shipped**: 90% goes out as a PayPal Payout and 10% is held back.
8. On the shop tab, click **Report a problem**, choose damaged rolls and send. The agent proposes a refund. On the supplier console, click **Approve**. PayPal refunds the shop from the holdback and the refund is recorded on its invoice.
9. Click **Export purchase order** for the CSV. Then **Mark all delivered** and **Release holdback**.

## Demo vs production

- **Shops are simulated**, apart from the one you join with. Demo shops get no PayPal order or invoice.
- **Payouts stand in for PayPal multiparty.** In the demo, Shoal's sandbox account collects the money and pays the supplier with Payouts. In production, shops would pay the supplier directly through multiparty, and Shoal would take a platform fee without holding funds.
- **Invoices come from the app's sandbox account** with the supplier's business name and the note "Issued by Shoal on behalf of …". In production, Shoal would call Invoicing for the connected supplier, so invoices come from the supplier's own PayPal account.
- **The store is in memory.** A restart resets the rounds, and only one instance can run. On Render's free plan the instance sleeps when idle, which also resets the demo.
- **There are no logins.** The shop, invoice and purchase-order routes are open in the demo.

## Sponsor tools

- **PayPal**: Orders and Payments (authorize, capture, void, refund), Payouts (supplier payout and holdback release), Invoicing (invoices in the supplier's name, payments and refunds recorded).
- **Anthropic Claude**: negotiation agent, claim triage, pack sizing.
- **Google Gemini**: negotiation agent, either side.
- **AG Grid**: the supplier's allocation grid and the purchase-order CSV export.
- **Bryntum Scheduler**: the round timeline, one lane per shop.
- **Channel3**: the retail benchmark.
- **Render**: hosting (`render.yaml`, one instance). Set `BRYNTUM_NPM_TOKEN` (the token from your `~/.npmrc` after `npm login`) and the `.env.example` values in the Render dashboard.

## Status

- [x] Buying rounds with tiers: authorize at join, capture at the group price, void on failure
- [x] Delivery split: per drop + per unit, reserved at join
- [x] Tier negotiation between two agents (Claude or Gemini), every offer checked in code
- [x] PayPal invoices in the supplier's name, payments and refunds recorded
- [x] Per-shop shipping, delivery and claims with AI triage and holdback refunds
- [x] Supplier payouts and holdback release via PayPal Payouts
- [x] Channel3 retail benchmark (receipts round)
- [x] Supplier console: AG Grid allocation and purchase-order export, Bryntum timeline
- [x] Shop addresses, invoice links and emails kept off public round data
- [x] Render config
- [x] Hosted demo on Render
- [ ] PayPal multiparty, persistent storage, logins

## License

MIT. See [LICENSE](LICENSE).
