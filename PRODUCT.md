# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: independent online shops** (small to mid-size, selling considered purchases such as coffee gear, electronics, furniture and fashion) where price is the usual reason a shopper leaves. The merchant (owner or e-commerce lead) sets negotiation rules once, then watches results in a dashboard.
- **Secondary market: second-hand resellers** (vintage, refurbished, pre-owned), where haggling is already expected. Shown as an expansion market, not the lead pitch.
- **Shoppers** meet Sweetspot as a "Make an offer" chat on a product page. They are not Sweetspot's customers; the merchant is.
- **Shopper agents**: AI assistants that negotiate and pay on a shopper's behalf (the agent-to-agent showpiece).
- **Hackathon judges** (PayPal and sponsor developer advocates, engineers and PMs) evaluate the product through a sub-3-minute video, the repo and a runnable demo.

## Product Purpose

Sweetspot is a negotiation agent for online shops. A shopper makes an offer; the shop's AI agent negotiates in natural language within rules the merchant set, and an agreed deal is paid immediately through PayPal. It wins back shoppers who would leave over price, without public markdowns. Success: a deal closes and is paid, and the merchant can see how much revenue negotiation won back and what margin it cost.

## Positioning

The AI never sets a price on its own: every move it proposes is checked in code against the merchant's floor price, maximum discount and allowed sweeteners, and an agreed price becomes a signed, expiring deal that PayPal checkout is created from. Negotiation, guardrail and payment are one flow, and the same shop agent can negotiate with a human or with another AI agent.

## Operating Context

- Shopper chat is embedded on the merchant's product page and takes on the shop's look, with a small "Negotiated by Sweetspot" mark. Sweetspot's own brand speaks to merchants (dashboard, landing page) and appears in the agent-vs-agent view.
- Merchant dashboard: negotiation log, revenue won back vs. a no-haggle baseline, rules editor, chat replays.
- Payment: PayPal Orders v2 + PayPal JS SDK v6 buttons, sandbox. PayPal buttons follow PayPal's own button rendering.
- Demo store currently sells one product (a burr espresso grinder) from `lib/catalog.ts`.

## Capabilities and Constraints

- Built: price guardrail (`lib/rules.ts`), signed 15-minute deals (`lib/deal.ts`), PayPal order create/capture routes, a placeholder offer box (`app/Offer.tsx`).
- Planned: seller agent chat (Claude with tool use), merchant dashboard (AG Grid), rules editor, webhooks, buyer agent using Channel3 price comparisons, hosting on Render.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript.
- Hackathon constraints: submission by Nov 12, 2026; demo video under 3 minutes must not include third-party trademarks or copyrighted music without permission; repo must be public and MIT-licensed at submission.
- Undecided: pricing model (monthly fee vs. share of recovered revenue); stock-based flexibility rules.

## Brand Commitments

- Name: **Sweetspot** (repo `TimeMist/sweetspot`).
- Shopper-facing chat is white-labelled to the shop, plus a small Sweetspot badge.

## Evidence on Hand

- No customers, testimonials, metrics or press exist. Do not fabricate them; demo figures must be labelled as demo data.
- Comparable products cited in the pitch (Nibble for e-commerce haggling, Pactum for Walmart supplier negotiation) are unverified and must be checked before being quoted.

## Product Principles

1. **The merchant stays in control.** Every price the agent offers is inside rules the merchant set, and the product shows that visibly.
2. **A deal is a deal.** Once agreed, the price is locked and payment is one step away.
3. **Negotiation should feel fair, not adversarial.** Shoppers should leave feeling they got a good deal, even when the agent holds the line.
4. **Show the money.** Merchants judge Sweetspot by revenue won back and margin given, so those numbers come first.

## Accessibility & Inclusion

Chat and checkout must work by keyboard and screen reader (live-region announcements for new agent messages), respect reduced-motion preferences, and meet WCAG 2.2 AA contrast.
