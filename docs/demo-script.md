# Shoal demo video script

Length: 2:55 (Devpost limit 3:00). One take in the PayPal sandbox, receipt-roll round. No music.

Host: https://shoal-m7zz.onrender.com (or `http://localhost:3000`). Paths below are relative to it.

## Before recording

1. Set `SHOP_AGENT_PROVIDER=claude` and `SUPPLIER_AGENT_PROVIDER=gemini`.
2. Open `/`, click **Reset demo**.
3. Open `/supplier/receipts` once so the retail benchmark loads. Check the header shows "Retail benchmark ≈ $1.50 a roll". If it doesn't, click **Refresh retail** (once a minute at most).
4. Click **Simulate 8 shops**. They join one at a time over about 8 seconds; the price tiers step down to 1,100 rolls, 8 shops, $1.13.
5. Open `/rounds/receipts` in a second tab. Log in to the PayPal sandbox buyer (personal) account in this browser beforehand, so the PayPal window doesn't ask for a password on camera.
6. Have a JPEG of a damaged roll ready (optional).
7. For the failed-round beat: open `/rounds/demo` (oat milk) in the same tab set, join with the minimum 96 cartons and pay with the sandbox buyer. Don't simulate shops there: one shop's 96 cartons stays below the 500-carton first tier.
8. In a second browser (PayPal keeps one sign-in per browser), sign in to the PayPal sandbox as the Shoal (platform) business account and open Activity, for the PayPal frame in beat 4.

Record in one browser profile throughout: each browser gets its own copy of the demo rounds, so a private window or another browser starts from an empty round.

The negotiation and claim triage each take a few seconds to a minute. Keep recording and trim the waits in editing.

## Beats

### 1. Problem (0:00–0:15, 15 s)

- **Page:** `/` (landing).
- **Action:** Hold on the headline, then scroll slowly to "How a round works".
- **Voice-over:** "Independent shops pay more per unit than chains for the same supplies, because they buy in small quantities. Shoal lets them buy together."

### 2. Join (0:15–0:50, 35 s)

- **Page:** `/rounds/receipts`.
- **Action:** Point at the ladder: $1.43 alone, $1.28, $1.13 (current), $1.02. Open **Sources** under "Retail elsewhere ≈ $1.50 a roll". Type a shop name, keep 50 rolls. Point at "We'll reserve $66.50 on PayPal (goods $56.50 + delivery $10.00)". Click the PayPal button, approve as the sandbox buyer.
- **On screen after:** "You're in. $66.50 reserved on PayPal, not charged."
- **Voice-over:** "This round is thermal receipt rolls. Eight shops are already in, so the price is $1.13 a roll, against $1.43 alone and about $1.50 at retail, with sources from Channel3. I join with 50 rolls. PayPal reserves goods plus delivery: sixty-six fifty. It's reserved, not charged, and my price can only go down."

### 3. Negotiate (0:50–1:20, 30 s)

- **Page:** `/supplier/receipts` (other tab).
- **Action:** Point at 1,150 rolls and 9 shops. Click **Negotiate**. Point at the Claude label on the shops' side, the Gemini label on Brightline Paper Co.'s side, and the "Every offer checked against supplier rules" tag. Hold on the result line ("Agreed at $X a roll, inside Brightline Paper Co.'s rules" or "No deal… The tier price stands").
- **Voice-over:** "Now the supplier's console. Claude negotiates for the shops, Gemini for the supplier. They can go below the $1.13 tier but never under the supplier's $1.02 floor. Every offer is checked against the supplier's rules in code, so the agents can't agree a price the supplier didn't allow. Agents decide prices; only code moves money."

### 4. Close (1:20–1:55, 35 s)

- **Page:** `/supplier/receipts`, then `/rounds/receipts`, then the PayPal sandbox (second browser).
- **Action:** Click **Close round** ("Round closed at $X a roll."). Switch to the shop tab. Point at the receipt: amount captured, the saving in Leaf green, the delivery line, "PayPal invoice SH-receipts-1-… sent to …". Click **View** to show the invoice from Brightline Paper Co., marked paid. Cut to the Shoal account's PayPal Activity and open the shop's payment: $66.50 authorized, the smaller amount captured.
- **Voice-over:** "I close the round. PayPal captures every shop at the group price, never more than it reserved. My receipt shows what I saved against buying alone, and the shop gets a real PayPal invoice in the supplier's name, already marked paid. In PayPal itself: sixty-six fifty reserved, less captured."

### 5. Fulfil (1:55–2:25, 30 s)

- **Page:** `/supplier/receipts`, then `/rounds/receipts`, then back.
- **Action:**
  1. Scroll to the allocation grid (AG Grid) and the round timeline (Bryntum). Click **Mark shipped** ("Shipped. Payout sent to Brightline Paper Co.").
  2. Shop tab: click **Report a problem**, choose **Damaged rolls**, enter 5, attach the photo, click **Send report**. Wait for the proposal.
  3. Supplier tab: click **Approve $… refund** on the claim. Point at the Invoice column showing Refunded.
  4. Click **Export purchase order**.
- **Voice-over:** "The grid shows each shop's order, and the timeline gives each shop its own lane. Marking it shipped pays the supplier ninety percent through PayPal Payouts and holds ten percent back. One shop reports five damaged rolls. The AI checks the report and proposes a refund; a person approves it. PayPal refunds that shop from the holdback, and the refund is recorded on its invoice. The supplier exports one purchase order for the whole round."

### 6. A round that fails (2:25–2:40, 15 s)

- **Page:** `/supplier/demo` (oat milk, set up in step 7 of Before recording).
- **Action:** Point at 96 cartons, 1 shop, "Below 500 cartons the round fails". Click **Close round** ("Round didn't reach its first tier. Every reservation was released.").
- **Voice-over:** "And if a round misses its first tier, nobody pays. PayPal voids every reservation."

### 7. Why PayPal / what's next (2:40–2:55, 15 s)

- **Page:** `/` (landing), footer visible.
- **Action:** Scroll to the footer "Built with PayPal (Orders, Payments, Payouts, Invoicing) …".
- **Voice-over:** "Shoal uses PayPal Orders, Payments, Payouts and Invoicing. Rounds last three days, because that's how long PayPal honors a reservation. In production, shops would pay suppliers directly through PayPal multiparty, with Shoal taking a platform fee and never holding the money."

## Numbers on screen (receipts round)

| Item | Value | Source |
|---|---|---|
| Tiers | $1.43 alone · 400+ $1.28 · 800+ $1.13 · 1,200+ $1.02 (floor) | `lib/seed.ts` |
| Delivery | $9.00 per drop + $0.02 a roll | `lib/seed.ts` |
| Demo shops | 8 shops, 1,100 rolls | `lib/seed.ts` |
| Join, 50 rolls at $1.13 | $56.50 goods + $10.00 delivery = $66.50 reserved | `lib/round.ts` `reserveCents` |
| Negotiation | 8 turns in total, between $1.13 and $1.02 | `lib/agents/negotiate.ts` `MAX_TURNS` |
| Capture | 50 × final price + $10.00, never above $66.50 | `lib/round.ts` `captureCents` |
| Payout at ship | 90% now, 10% holdback | `lib/seed.ts` `holdbackPct` |
| Claim refund | rolls approved × final price, capped by the shop's goods and the holdback left | `lib/agents/triage.ts`, `lib/settle.ts` |

If no deal is reached, the round closes at $1.13: $66.50 captured, $15.00 saved against $71.50 alone.
