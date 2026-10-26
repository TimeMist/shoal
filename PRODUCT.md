# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: independent shops** (cafés, bakeries, bookshops, boutiques, small grocers) that buy the same supplies as chains but in small quantities, so they pay more per unit. The owner or manager commits to buying rounds and tracks deliveries; they are busy, price-sensitive and not procurement specialists.
- **Suppliers**: small and mid-size producers and wholesalers selling direct (coffee roasters, packaging makers, dry-goods producers). They set volume price tiers, confirm rounds and ship to each shop.
- **Hackathon judges** (PayPal and sponsor developer advocates, engineers and PMs) evaluate the product through a sub-3-minute video, the repo and a runnable demo.

## Product Purpose

Shoal lets independent shops buy together so they get chain-level prices. Shops commit to quantities in short **buying rounds**; the more shops join, the lower everyone's price. Each shop's commitment is a PayPal authorization at the price showing when it joins (prices only go down after that); when the round closes, Shoal captures each shop's share at the price the group actually reached (less than authorized), or voids it if the round fails. The supplier ships to each shop and is paid through PayPal, with a holdback that covers delivery problems. Success: a round closes, every shop pays less than it would alone, goods arrive, and any problem is resolved for the affected shop only.

## Positioning

On-demand buying rounds with automatic settlement: no membership scheme, no fixed marketplace price list. Money is reserved up front and only the achieved price is charged, delivery problems are isolated per shop, and AI does the coordination work (suggesting quantities, negotiating the tier with the supplier, splitting shipping fairly, resolving delivery claims) while every price and payout is checked in code against the round's rules.

## Operating Context

- Rounds are short (days, not weeks) because PayPal authorizations are only reliably honoured for a few days; repeat members can use saved payment methods charged at close.
- Default logistics: the supplier receives one combined purchase order split by shop and ships to each shop directly. A local hub (one shop receives, others collect) is a roadmap option, not built.
- Each shop's part of a round is its own sub-order with its own payment, tracking and confirmation. Delivery claims (missing, damaged, short) are resolved per shop from a holdback on the supplier's payout (e.g. 10%) released after confirmations.
- Money flow in the demo: Shoal collects authorizations and pays the supplier via PayPal Payouts. Production design: PayPal multiparty (shops pay the supplier directly, Shoal takes a platform fee and never holds funds). The demo must say which is which.
- Sponsor tools used where they fit naturally: AG Grid for the round allocation grid, Bryntum for round and delivery timelines, Channel3 for retail price benchmarks, Render for hosting.

## Capabilities and Constraints

- Built: two demo buying rounds (oat milk, thermal receipt rolls) with tiered pricing; a PayPal authorization at the price shown when a shop joins (goods + delivery), capture at the group price at close, void on failure; tier negotiation between two agents (Claude or Gemini per side) with every offer checked in code (`lib/guard.ts`) and the deal signed (`lib/deal.ts`); delivery split (per drop + per unit); PayPal invoices in the supplier's name, marked paid; purchase-order CSV export; per-shop tracking and delivery; claims with AI triage, a person's approval and refunds from a 10% holdback; supplier payouts via Payouts; Channel3 retail benchmark; supplier console with AG Grid allocation and Bryntum timeline; PII redaction on shop-facing state.
- Planned: PayPal multiparty (shops pay the supplier directly), persistent storage, logins, a local-hub delivery option.
- Stack: Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript. PayPal server SDK covers Orders and Payments; Invoicing and Payouts use direct REST calls.
- Hackathon constraints: submission by Nov 12, 2026; demo video under 3 minutes without third-party trademarks or copyrighted music; repo public and MIT-licensed at submission.
- Undecided: pricing model (platform fee per round vs. subscription); first product categories; whether a real supplier will participate before submission.

## Brand Commitments

- Name: **Shoal**. Small fish swim together to move like a big one; independent shops buy together to get chain prices.
- Mark: the **Swimmy**, 61 small dots (shops) that together form one fish; the ink-outlined eye is the agent. It evolved from the approved Agent Tag via a "many become one" exploration the user chose. Solid fish below 48px; lighter dot ramp on Jam and ink.
- Visual world: the locked Berry palette and its five ownership rules, Funnel Display and Funnel Sans, flat never glowing (see DESIGN.md).
- References the owner admires: Linear, Stripe, Revolut. Rejected: retro, bland fintech, playful-soft (Arc, Raycast), generic AI pink-violet.

## Evidence on Hand

- No customers, suppliers, testimonials, metrics or press exist. Do not fabricate them; demo shops, suppliers and figures must be labelled as demo data.
- Buying groups and co-ops are an established offline model (vendor sources cite 50–300 members and 10–25% savings; unverified). No on-demand buying-round product with automatic settlement was found in desk research; this is not exhaustive.
- Supplier willingness is unvalidated; a few real supplier replies would be the strongest evidence for the pitch.

## Product Principles

1. **Everyone pays less as more shops join.** The price a shop sees should only ever go down after it commits.
2. **Reserve, don't take.** Money is held, never charged, until the round succeeds, and only the achieved price is captured.
3. **One shop's problem stays one shop's problem.** Deliveries, claims and refunds are isolated per shop.
4. **Rules decide, AI coordinates.** Prices, tiers and payouts are enforced in code; the AI suggests, negotiates and explains.
5. **Show the saving.** Every screen makes clear what a shop saves versus buying alone.

## Accessibility & Inclusion

Rounds, commitments and claims must work by keyboard and screen reader (live-region announcements for tier changes and round outcomes), respect reduced-motion preferences, and meet WCAG 2.2 AA contrast. Never rely on colour alone to distinguish shops, suppliers or statuses.
