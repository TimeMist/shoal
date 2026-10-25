# Shoal

Buying power for independent shops. Shops join short buying rounds for the supplies they all need; the more shops join, the lower everyone's price. Each shop's money is reserved with PayPal, never taken until the round succeeds, and only the group price is charged.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

## How it works

- **Reserve, don't take.** Joining a round creates a PayPal authorization at the price showing at that moment. When the round closes, Shoal captures each shop's share at the price the group reached (never more), or voids the authorization if the round fails.
- **Rules decide, AI coordinates.** Prices, tiers and payouts are checked in code (`lib/rules.ts`); the AI suggests quantities, negotiates the tier with the supplier inside the supplier's rules, splits shipping and triages delivery claims.
- **One shop's problem stays one shop's problem.** Each shop's part of a round is its own sub-order with its own payment and tracking; delivery claims are refunded from a supplier holdback.
- **Brand and design:** see `design/brand/index.html`, `DESIGN.md` and `PRODUCT.md`.

## Run it locally

Requirements: Node 24+ and a PayPal developer account with a sandbox app.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm test                     # guardrail and signed-token tests
npm run dev                  # http://localhost:3000
```

To pay, log in with a **sandbox personal (buyer) account** from developer.paypal.com > Testing Tools > Sandbox Accounts.

## Status

- [x] Price guardrail and signed tokens, with tests (from the earlier scaffold; being adapted to rounds)
- [x] PayPal sandbox order create and capture
- [x] Brand and design guidelines
- [ ] Buying rounds: tiers, authorize at join, partial capture at close, void on failure
- [ ] Supplier tier negotiation and shipping split (AI, inside supplier rules)
- [ ] Per-shop deliveries, claims and supplier holdback; payouts via PayPal Payouts
- [x] Supplier console: allocation grid (AG Grid), AI negotiation replay, round actions and payouts
- [x] Bryntum Scheduler (trial) for the round timeline
- [ ] Hosted demo on Render

## License

MIT
