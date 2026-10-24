# Sweetspot

A negotiation agent for online shops. Shoppers make an offer, the shop's AI agent negotiates within rules the merchant sets, and the agreed deal is paid through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

## How it works

- **The AI never sets a price on its own.** The agent proposes moves (counter-offer, accept, add a sweetener such as free shipping). `lib/rules.ts` checks every move against the merchant's floor price and maximum discount.
- **The agreed price can't be tampered with.** An accepted deal becomes a signed token that expires after 15 minutes (`lib/deal.ts`). The PayPal order is created on the server from that token, never from a price sent by the browser.
- **Payment:** PayPal Orders v2 (server SDK) and the PayPal JS SDK v6 button, in the sandbox.

## Run it locally

Requirements: Node 24+ and a PayPal developer account with a sandbox app.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm test                     # pricing guardrail and deal signing tests
npm run dev                  # http://localhost:3000
```

To pay, log in with a **sandbox personal (buyer) account** from developer.paypal.com > Testing Tools > Sandbox Accounts.

## Status

- [x] Pricing guardrail and signed deals, with tests
- [x] PayPal sandbox checkout at the negotiated price
- [ ] Seller agent chat (Claude, tool use)
- [ ] Merchant dashboard (AG Grid) and rules editor
- [ ] Buyer agent haggling agent-to-agent (Channel3 price comparisons)
- [ ] Hosted demo on Render

## License

MIT
