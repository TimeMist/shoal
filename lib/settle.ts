// Settlement math: holdback, claim refunds, release. All money is integer cents.

export function splitPayout(capturedTotal: number, holdbackPct: number): { now: number; held: number } {
  const held = Math.round((capturedTotal * holdbackPct) / 100);
  return { now: capturedTotal - held, held };
}

// A refund can't exceed what the shop paid (net of earlier refunds) or what's still held.
export function clampRefund(
  requested: number,
  shopCaptured: number,
  shopRefunded: number,
  holdbackLeft: number,
): { refund: number; shortfall: number } {
  const refund = Math.max(0, Math.min(requested, shopCaptured - shopRefunded, holdbackLeft));
  return { refund, shortfall: requested - refund };
}

export function releaseHoldback(held: number, refunded: number): number {
  return Math.max(0, held - refunded);
}
