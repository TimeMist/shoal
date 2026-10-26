# Shoal extras: delivery split, PayPal invoices, retail benchmark

Date: 2026-10-26. Status: approved in conversation, awaiting written review.
Builds on `PRODUCT.md`, `DESIGN.md` and the implementation in `docs/superpowers/plans/2026-10-25-shoal.md` (Tasks 1–12 done). Task 13 (deploy, docs, video) runs after these.

## Why

- **Delivery split** answers the judges' first logistics question: who pays for delivery, and is it fair per shop?
- **PayPal invoices** give each shop a proper receipt from the company it bought from, and show a third PayPal product (Invoicing) beyond Orders/Payments and Payouts.
- **Retail benchmark** makes the saving concrete with a real, sourced retail price (Channel3, a hackathon sponsor).

Constraints: submission Nov 12, 2026; everything shown is either a real sandbox/API result or labelled demo data; rules decide amounts, AI never supplies a number that reaches money or the screen unchecked.

## 1. Delivery-cost split

**Rule.** The supplier sets delivery rates on the round: `delivery: { perDrop: number; perCarton: number }` in cents. Demo values: `perDrop: 1200`, `perCarton: 5` (120 cartons → $18.00).

- `deliveryCents(round, qty) = perDrop + perCarton × qty`. Fixed when the shop joins; it never changes, so a shop's price still only goes down.
- **Reserve** = `reserveCents(round, unitsBefore, qty) + deliveryCents(round, qty)` (goods at the price showing now, plus delivery). The quote token carries the total.
- **Capture** = `min(qty × finalPrice + delivery, reserved)`.
- **Savings** compare goods only (`aloneCents − goods captured`); a shop buying alone would pay delivery too.
- **Supplier payout** includes delivery (the supplier ships); the 10% holdback applies to the whole captured total.
- **Claim refunds** stay `cartons × finalPrice`, clamped as today. Delivery is not refunded in this version.
- **PayPal order** sends an amount breakdown: `item_total` (goods) and `shipping` (delivery). The authorization check still compares the total.

**Screens.** Join panel: "We'll reserve **$X** on PayPal (goods $A + delivery $B). You'll pay the group price when the round closes, never more. If it doesn't reach its first tier, nothing is charged." Receipt: a delivery line. Supplier grid: a Delivery column; console header shows the rates next to the tiers.

**Tests.** Demo shops' delivery amounts (e.g. Hilltop 240 → $24.00); reservation includes delivery (Corner Books at 516 units: 120 × $2.16 + $18.00 = $277.20); capture never exceeds the reservation with delivery; payout total includes delivery; savings exclude delivery.

## 2. PayPal invoices in the supplier's name, plus a purchase-order export

**Model.** Shoal issues each shop's invoice in the supplier's name under a billing mandate (the supplier stays the seller and receives a copy of each invoice). In production this uses PayPal multiparty: the platform calls the Invoicing API for the connected supplier with `PayPal-Auth-Assertion`, so invoices come from the supplier's own PayPal account. In the sandbox there is no connected supplier, so invoices are issued from the app's sandbox account with `invoicer.business_name` "Meadow Oat Co." and a note "Issued by Shoal on behalf of Meadow Oat Co."; the README says so. Shoal's business model is unchanged: a coordinator taking a platform fee, never the seller.

**Data.** At join, store from the PayPal authorization response: the payer's email and the order's shipping address (`payerEmail`, `address` on the commitment). Demo shops get fake addresses in `lib/seed.ts`, labelled demo.

**Flow (new `lib/invoicing.ts`, REST v2 with the existing OAuth token helper).**
1. After close captures succeed, for each real captured commitment without an invoice: build the invoice (pure function), create draft → send to the recipient → record payment (method PAYPAL, referencing the capture id, amount = captured).
2. The builder produces one line `cartons × finalPrice` and `shipping = delivery`; its total must equal `captured` to the cent, otherwise nothing is sent and `invoiceError` is recorded on that commitment.
3. Invoicing failures never undo the close; they are recorded per shop. An "Issue invoices" step on the supplier console retries, skipping commitments that already have `invoiceId`.
4. Invoice numbers are unique per round and across demo resets (same scheme as payout batch ids, e.g. `SHOAL-<round>-<n>-<closesAt>`).
5. When a claim refund is approved, record a refund on that shop's invoice (amount = refunded). A failure there is recorded, not fatal, since the PayPal refund already happened.
6. Demo shops get no invoice; the grid shows "Demo shop".

**Screens.** Shop receipt: "PayPal invoice INV-… sent to you@…" with a View link (the invoice's recipient view URL). Supplier grid: an Invoice column (number + Paid / Refunded / Error). New supplier action: "Issue invoices" (retry).

**Purchase-order export.** "Export purchase order" on the supplier console, using AG Grid's CSV export (community). One row per shop: shop, delivery address, cartons, unit price, goods, delivery, total captured, PayPal capture id, invoice number, tracking number. Suppliers that invoice from their own system would turn Shoal invoicing off and use this instead (supplier setting: roadmap only).

**Sandbox notes.** Invoice emails land in PayPal's sandbox notifications, not a real inbox. If Invoicing isn't enabled for the sandbox app, the console shows the API error clearly (as with Payouts).

**Tests.** Invoice body from demo numbers (total equals capture); a mismatch blocks sending; retry skips invoiced shops; a refund records against the right invoice; CSV columns and values.

## 3. Channel3 retail benchmark

**Lookup (new `lib/channel3.ts`).** One Channel3 search for the round's product (e.g. "barista oat milk 1 L") with `CHANNEL3_API_KEY`; read up to 10 products and their offers (merchant, price, URL). Confirm the endpoint and auth header against Channel3's docs at build time.

**AI's job (Claude, strict tool).** For each offer, return only: `relevant` (same kind of product: barista oat milk, 1 L cartons) and `cartons` (integer count of 1 L cartons in the pack). The model never supplies prices.

**Code does the maths (pure, tested).** Per-carton price = offer price ÷ cartons, in integer cents; drop irrelevant offers and pack counts outside 1–48; benchmark = median of the rest. Fewer than 3 usable offers → no benchmark; nothing is shown and no number is invented.

**When.** Automatically the first time the supplier console loads a round, and on demand via "Refresh retail". Cached per product for 24 hours outside the round state (survives demo resets), holding the per-carton price, the offers used (merchant, link, pack size, price) and `fetchedAt`. Each lookup costs 1 credit of the 1,000 free monthly credits.

**Screens.** Ladder: a "Retail elsewhere ≈ $X.XX" line above "Alone" (not a tier), with a Sources disclosure listing each merchant, link and pack size. Receipt: "Retail elsewhere ≈ $X.XX a carton (Channel3, N offers, fetched <date>)". The headline saving stays against buying alone; retail is context.

**Failure.** No key, Channel3 error, 402 (credits) or too few offers → the line is hidden; the supplier console says why; shop pages show nothing.

**Tests.** Normalisation on fixture offers (mixed packs, irrelevant dropped, median, fewer than 3 → none); AI output validated (boolean + integer in range); cache serves a second request without calling Channel3.

## Setup

- `CHANNEL3_API_KEY` in `.env.local` (placeholder added; free tier).
- Invoicing must be available on the sandbox app (checked at first use).

## Out of scope

Delivery refunds on claims; a supplier setting to switch Shoal invoicing off; webhook/ERP feeds to suppliers; live per-view retail lookups; local-hub delivery.
