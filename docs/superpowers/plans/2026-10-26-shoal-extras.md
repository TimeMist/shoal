# Shoal Extras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-shop delivery charge to every reservation and capture, PayPal invoices in the supplier's name with a purchase-order export, and a Channel3 retail benchmark, on top of the finished Shoal demo (Tasks 1–12 of `2026-10-25-shoal.md`).

**Architecture:** Delivery is a pure rule in `lib/round.ts` that flows through the existing reserve → capture → payout path unchanged in shape. Invoicing and Channel3 are thin REST adapters behind pure, tested builders/normalisers, orchestrated by small lib functions with injected I/O (the `lib/claims.ts` / `lib/fulfil.ts` pattern), called from thin routes. UI changes extend existing components.

**Tech Stack:** Next.js 16.4 App Router, React 19.3, TypeScript, Node test runner (`npm test`), PayPal server SDK 2.5 + REST (Invoicing v2, OAuth), Channel3 REST, `@anthropic-ai/sdk` (`claude-opus-5-5`), AG Grid community CSV export.

**Spec:** `docs/superpowers/specs/2026-10-26-shoal-extras-design.md` (with `PRODUCT.md`, `DESIGN.md`). Earlier plan for context and house rules: `docs/superpowers/plans/2026-10-25-shoal.md`.

## Global Constraints

- All money is integer cents; PayPal strings only via `toMoney` in adapters; currency `USD`.
- Demo delivery rates: `delivery: { perDrop: 1200, perCarton: 5 }` on the demo round.
- `deliveryCents(round, qty) = perDrop + perCarton × qty`; fixed at join; reserve = goods at the price showing + delivery; capture = `min(qty × finalPrice + delivery, reserved)`; savings compare goods only; payout and holdback include delivery; claim refunds are `cartons × finalPrice` (no delivery refund).
- Join copy, verbatim: "We'll reserve **{total}** on PayPal (goods {goods} + delivery {delivery}). You'll pay the group price when the round closes, never more. If it doesn't reach its first tier, nothing is charged."
- Invoices: issued in the supplier's name (`invoicer.business_name` = round.supplier), note "Issued by Shoal on behalf of {supplier}."; one per real captured shop; total must equal `captured` to the cent or nothing is sent; failures recorded per shop, never undo a close; numbers `SHOAL-{roundId}-{n}-{Date.parse(closesAt)}` (n = 1-based commitment index).
- Demo shops: no invoice ("Demo shop"), fake addresses labelled demo.
- Channel3: `CHANNEL3_API_KEY`; one search per product; the model returns only `relevant` + `cartons`; prices only from Channel3; per-carton = round(price ÷ cartons) cents; drop irrelevant, cartons outside 1–48, non-USD or missing prices; median of the rest; fewer than 3 → no benchmark (nothing shown); cache per product 24 h outside round state.
- Claude settings as in the earlier plan (model `claude-opus-5-5`, strict tools, `tool_choice` auto, fallbacks, check `stop_reason`); reuse `ask` from `lib/claude.ts`.
- Secrets only in `.env.local`; never print or commit them. Sandbox only.
- Routes follow the existing pattern (`RouteContext<...>`, `await ctx.params`, JSON `{ error }` with 400/404/409/500/502 via `lib/http.ts`).
- Design per `DESIGN.md`: Leaf for savings, never colour alone, no PayPal blue, Berry only for joining and approving money moves.

## Review Focus

1. **Delivery on a failed round** — the single authorization covers goods + delivery, so a void releases both and nothing is charged. Test: `closeRound below first tier voids the full goods+delivery authorization` (Task 1).
2. **Capture after a price drop keeps delivery whole** — a shop that reserved at $2.40 captures `qty × final + delivery`, never more than reserved, never less delivery. Test: `capture keeps delivery and never exceeds the reservation` (Task 1).
3. **Invoice total disagrees with the capture** (e.g. a capture clamped at the reservation) — no invoice is created; `invoiceError` names the mismatch. Test: `issueInvoices records a mismatch and sends nothing` (Task 3).
4. **One shop's invoice call fails mid-loop** — the other shops are still invoiced and the round stays closed. Test: `issueInvoices isolates a failing shop` (Task 3).
5. **Channel3 returns junk offers** (price 0 or missing, non-USD, pack 0 or 60, irrelevant) — all dropped; fewer than 3 usable → `null`. Test: `normalise drops junk and needs three offers` (Task 5).

---

### Task 1: Delivery rule through reserve, capture and payout

**Files:**
- Modify: `lib/round.ts` (Round type + functions), `lib/seed.ts` (demo rates), `lib/store.ts:84` (no change in call; verify), `lib/close.ts:32`
- Test: `lib/round.test.ts`, `lib/close.test.ts`, `lib/store.test.ts`, `lib/fulfil.test.ts` (update expected values that now include delivery)

**Interfaces:**
- Consumes: existing `Round`, `reserveCents`, `captureCents`, `savingsCents`, `closeRound`.
- Produces:
  - `Round.delivery: { perDrop: number; perCarton: number }`
  - `deliveryCents(round: Round, qty: number): number`
  - `reserveCents(round, unitsBefore, qty)` now returns goods + delivery
  - `captureCents(qty: number, finalPrice: number, reserved: number, delivery: number): number` = `min(qty × finalPrice + delivery, reserved)`
  - `goodsCents(round: Round, qty: number, captured: number): number` = `captured − deliveryCents(round, qty)`
  - `savingsCents(round, qty, captured)` = `aloneCents(round, qty) − goodsCents(round, qty, captured)`

- [ ] **Step 1: Write failing tests** in `lib/round.test.ts`: `deliveryCents(round, 240) === 2400`, `deliveryCents(round, 120) === 1800`; `reserveCents(round, 516, 120) === 27720`; `capture keeps delivery and never exceeds the reservation`: `captureCents(120, 185, 27720, 1800) === 24000`, `captureCents(120, 250, 27720, 1800) === 27720`; `savingsCents(round, 120, 24000) === 6600` (delivery excluded). In `lib/close.test.ts`: `closeRound below first tier voids the full goods+delivery authorization` (2 real shops, 300 units → 2 void calls, `status` "released", no capture) and a capture test asserting `qty × 185 + delivery` per real shop.
- [ ] **Step 2:** `npm test` → the new tests FAIL.
- [ ] **Step 3:** Implement the interfaces; demo rates in `DEMO_ROUND`; `closeRound` passes `deliveryCents(round, c.qty)`. Update older tests whose expected amounts change (reservations, captures, payout totals) to the delivery-inclusive values, deriving each from the rule, not from re-running the code.
- [ ] **Step 4:** `npm test` → all PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat: delivery charge in reservations, captures and payouts`.

### Task 2: Delivery in PayPal orders and the UI; payer email and address at join

**Files:**
- Modify: `lib/paypal.ts` (`createAuthorizeOrder`, `authorizeOrder`), `app/api/rounds/[id]/orders/route.ts`, `app/api/rounds/[id]/orders/[orderId]/authorize/route.ts`, `lib/store.ts` (Commitment fields), `lib/seed.ts` (demo addresses), `app/rounds/[id]/JoinPanel.tsx`, `app/rounds/[id]/Receipt.tsx`, `app/supplier/AllocationGrid.tsx`, `app/supplier/SupplierConsole.tsx`, `scripts/smoke-paypal.ts` (call sites)
- Test: `lib/join.test.ts` (or `lib/paypal.test.ts` for the pure helper)

**Interfaces:**
- Consumes: Task 1 `deliveryCents`, `goodsCents`.
- Produces:
  - `createAuthorizeOrder(amount: { goods: number; delivery: number }, description: string, referenceId: string): Promise<string>` — purchase unit amount = goods + delivery with `breakdown: { itemTotal: goods, shipping: delivery }`
  - `orderAmount(goods: number, delivery: number)` pure helper returning the SDK amount object (tested)
  - `Authorization` gains `payerEmail?: string; address?: string` (address as one line: line 1, city, region, postal code, country)
  - `Commitment` gains `delivery: number; payerEmail?: string; address?: string`
  - `addCommitment` sets `delivery = deliveryCents(round, qty)` for every commitment (real and simulated) and accepts optional `payerEmail` and `address`.
  - Demo shops get `address` values in `DEMO_SHOPS` (obviously fake, e.g. "12 Demo Street, Springfield"), and `simulateShops` copies them.
- [ ] **Step 1: Write failing test** `orderAmount(25920, 1800)` → `{ currencyCode: "USD", value: "277.20", breakdown: { itemTotal: { currencyCode: "USD", value: "259.20" }, shipping: { currencyCode: "USD", value: "18.00" } } }`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement; `/orders` derives `delivery = deliveryCents(round, q.qty)` and `goods = q.reserved − delivery`; `/authorize` stores `delivery`, `payerEmail`, `address` on the commitment (verify field paths against the SDK types: `result.payer.emailAddress`, `purchaseUnits[0].shipping.address`). UI: join copy verbatim from Global Constraints; receipt adds a "Delivery" line; grid adds a Delivery column (pinned total sums it); console shows "Delivery $12.00 per drop + $0.05 per carton" next to the tiers.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` → clean. Dev server: reset → simulate 8 → screenshots of the join panel, a receipt and the grid at 1440 (save under the SDD workspace).
- [ ] **Step 5:** Commit `feat: delivery line in PayPal orders and screens; keep payer email and address`.

### Task 3: Invoice builder, Invoicing adapter and issueInvoices

**Files:**
- Create: `lib/invoicing.ts` (REST adapter), `lib/invoices.ts` (pure builder + orchestrator), `lib/invoices.test.ts`
- Modify: `lib/paypal.ts` (extract `accessToken(): Promise<string>` from `sendPayout`, reuse it), `lib/store.ts` (Commitment invoice fields)

**Interfaces:**
- Consumes: Task 1 `deliveryCents`, `Commitment.payerEmail/address/delivery`, `toMoney`.
- Produces:
  - `Commitment` gains `invoiceId?: string; invoiceNumber?: string; invoiceUrl?: string; invoiceStatus?: "paid" | "refunded"; invoiceError?: string`
  - `invoiceNumber(s: RoundState, index: number): string` → `SHOAL-{roundId}-{index+1}-{Date.parse(closesAt)}`
  - `buildInvoice(s: RoundState, c: Commitment, number: string): InvoiceDraft | { error: string }` — one item `{ name: product, quantity: c.qty, unitAmount: finalPrice }`, shipping = `c.delivery`, recipient = `c.payerEmail` + business name `c.shop`, invoicer business name = supplier, note per Global Constraints, reference = capture id; returns `{ error }` when `qty × finalPrice + delivery !== c.captured` or `payerEmail` is missing.
  - `type InvoiceApi = { create(d: InvoiceDraft): Promise<string>; send(id: string): Promise<string /* recipient view url */>; recordPayment(id: string, cents: number, captureId: string): Promise<void>; recordRefund(id: string, cents: number): Promise<void> }`
  - `issueInvoices(s: RoundState, api: InvoiceApi): Promise<{ issued: number; failed: number }>` — for each non-simulated commitment with `captured` and no `invoiceId`: build → create → send → recordPayment; set fields and `invoiceStatus = "paid"`; on any error set `invoiceError` and continue.
  - `lib/invoicing.ts` exports `invoiceApi: InvoiceApi` over `POST /v2/invoicing/invoices` (with `Prefer: return=representation`), `/send` (`send_to_recipient: true`), `/payments` (method `PAYPAL`), `/refunds` (method `PAYPAL`); verify the bodies and the recipient view URL field (`detail.metadata.recipient_view_url`) with Context7 (`/websites/developer_paypal_api_rest`) before writing.
- [ ] **Step 1: Write failing tests** with a fake `InvoiceApi`: `buildInvoice` on Corner Books at final 185 (captured 24000) → item 120 × "1.85", shipping "18.00", total equals capture; `issueInvoices records a mismatch and sends nothing` (captured 23999 → `invoiceError` contains "does not match", `create` never called); `issueInvoices isolates a failing shop` (`send` throws for shop 1 → shop 2 still `invoiceStatus "paid"`, shop 1 has `invoiceError`, result `{ issued: 1, failed: 1 }`); retry skips a commitment that already has `invoiceId`; simulated shops are skipped; `invoiceNumber` differs for two different `closesAt`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit` → clean.
- [ ] **Step 5:** Commit `feat: PayPal invoice builder and issuer in the supplier's name`.

### Task 4: Wire invoices into close, claims and screens; purchase-order export

**Files:**
- Create: `app/api/rounds/[id]/invoices/route.ts` (POST retry)
- Modify: `app/api/rounds/[id]/close/route.ts`, `lib/claims.ts` + `app/api/rounds/[id]/claims/[claimId]/route.ts`, `app/rounds/[id]/Receipt.tsx`, `app/supplier/AllocationGrid.tsx`, `app/supplier/SupplierConsole.tsx`
- Test: `lib/claims.test.ts`

**Interfaces:**
- Consumes: Task 3 `issueInvoices`, `invoiceApi`, `InvoiceApi`.
- Produces:
  - `/close` calls `issueInvoices(s, invoiceApi)` after a successful (`closed`) close; its errors never change the close response status.
  - `POST /invoices` → `{ issued, failed, state }`; 409 unless the round is closed.
  - `approveClaim(s, claimId, refund, recordInvoiceRefund?: (invoiceId: string, cents: number) => Promise<void>)` — after a successful refund on a shop with `invoiceId`, records the refund, sets `invoiceStatus = "refunded"`; a failure sets `invoiceError` and still returns ok.
- [ ] **Step 1: Write failing tests** in `lib/claims.test.ts`: approve on an invoiced shop calls `recordInvoiceRefund(invoiceId, refunded)` and sets `invoiceStatus "refunded"`; when it throws, the claim is still approved and `invoiceError` is set; a shop without `invoiceId` never calls it.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. Screens: receipt shows "PayPal invoice {number} sent to {payerEmail}" with a View link (`invoiceUrl`), or "Invoice pending" / the error for that shop; grid Invoice column (number + Paid / Refunded / Error, "Demo shop" for simulated); console step "Issue invoices" (enabled when closed and any real captured shop lacks an invoice) and an "Export purchase order" button using AG Grid `exportDataAsCsv` with columns Shop, Delivery address, Cartons, Unit price, Goods, Delivery, Total captured, PayPal capture id, Invoice number, Tracking (file name `shoal-{roundId}-purchase-order.csv`).
- [ ] **Step 4:** `npm test`, tsc, lint, build → clean. Live check (sandbox, keep to one run): reset → simulate 8 → close → Issue invoices with no real shops reports 0 issued; then report what the user must do to see a real invoice (join once via PayPal). Export the CSV and check its header and one row. Screenshots of grid and console.
- [ ] **Step 5:** Commit `feat: invoices on close and claim refunds, purchase-order export`.

### Task 5: Channel3 lookup, pack classifier and benchmark cache

**Files:**
- Create: `lib/channel3.ts` (REST adapter), `lib/agents/packs.ts` (Claude classifier), `lib/benchmark.ts` (normalise + cache + `getBenchmark`), `lib/benchmark.test.ts`, `app/api/rounds/[id]/benchmark/route.ts`
- Modify: `.env.example` (already has `CHANNEL3_API_KEY`)

**Interfaces:**
- Produces:
  - `type Offer = { merchant: string; url: string; title: string; price?: number /* dollars */; currency?: string }`
  - `searchOffers(query: string): Promise<Offer[]>` — up to 10 products' offers; endpoint and auth header confirmed via Context7 (`/websites/trychannel3`); missing key → `ConfigError`.
  - `type PackVerdict = { relevant: boolean; cartons: number }`
  - `classifyPacks(product: string, offers: Offer[], model?): Promise<PackVerdict[]>` — one Claude call with a strict tool returning one verdict per offer index; validates booleans and integers.
  - `type Benchmark = { perCarton: number; offers: { merchant: string; url: string; cartons: number; price: number }[]; fetchedAt: string }`
  - `normalise(offers: Offer[], verdicts: PackVerdict[]): Benchmark["offers"]` and `median(cents: number[]): number`
  - `getBenchmark(product: string, opts: { refresh?: boolean; now?: number; search?; classify? }): Promise<{ benchmark: Benchmark | null; reason?: string }>` — module-level cache keyed by product, 24 h TTL.
  - Route: `GET /benchmark` → cached-or-fetch; `POST /benchmark` → refresh; JSON `{ benchmark, reason }`; Channel3 402 → reason "Channel3 credits used up"; no key → reason "No Channel3 key".
- [ ] **Step 1: Write failing tests:** `normalise drops junk and needs three offers` (fixture: 6-pack $23.94, 12-pack $41.88, single $4.29, price 0, EUR offer, irrelevant "almond milk", pack 60 → usable per-carton 399, 349, 429 → `median === 399`; drop one → `getBenchmark` returns `benchmark: null` with reason "Not enough comparable offers"); median of even count rounds to whole cents; `classifyPacks` rejects a non-integer `cartons` from a fake model; cache: second `getBenchmark` within 24 h doesn't call `search`; `refresh: true` does.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test`, tsc → clean. Live check only if `CHANNEL3_API_KEY` is set (check presence, never print): one `GET /benchmark` for the demo product; report the median, offer count and merchants. If unset, report that.
- [ ] **Step 5:** Commit `feat: Channel3 retail benchmark with AI pack sizing`.

### Task 6: Benchmark on the ladder, receipt and supplier console

**Files:**
- Modify: `components/TierLadder.tsx` (optional `retail?: Benchmark`), `app/rounds/[id]/RoundScreen.tsx`, `app/rounds/[id]/Receipt.tsx`, `app/rounds/[id]/api.ts`, `app/supplier/SupplierConsole.tsx`

**Interfaces:**
- Consumes: Task 5 route and `Benchmark` type.
- Behaviour: ladder shows "Retail elsewhere ≈ $X.XX" above "Alone" (not a rung, not struck through) with a "Sources" disclosure (`<details>`) listing merchant, pack size and link; hidden when `benchmark` is null. Receipt adds "Retail elsewhere ≈ $X.XX a carton (Channel3, N offers, fetched {date})". Supplier console fetches `GET /benchmark` on first load, shows the line or the `reason`, and a "Refresh retail" button (`POST`). Shop pages fetch once per page load, never refresh.
- [ ] **Step 1:** Implement.
- [ ] **Step 2:** tsc, lint, build, tests → clean. Screenshots at 1440 and 390 of the ladder with and without a benchmark (mock the route response in the browser if no key), the receipt and the console line.
- [ ] **Step 3:** Commit `feat: show the retail benchmark next to the group price`.

---

After these tasks, continue with Task 13 of `2026-10-25-shoal.md` (deploy, README, demo script), adding: README sections for delivery rates, invoices in the supplier's name (sandbox vs multiparty), Channel3 setup and credits; and add "PayPal Invoicing" and "Channel3" to the landing page "Built with" line.
