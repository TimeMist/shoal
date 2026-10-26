import { deliveryCents, reserveCents, validateQty } from "./round.ts";
import type { Round } from "./round.ts";
import { ROUND_IDS, seedRound, type RoundId } from "./seed.ts";

export type Commitment = {
  id: string;
  shop: string;
  qty: number;
  reserved: number;
  delivery: number;
  payerEmail?: string;
  address?: string;
  simulated: boolean;
  orderId?: string;
  authorizationId?: string;
  captureId?: string;
  captured?: number;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceSent?: boolean;
  invoiceUrl?: string;
  invoiceStatus?: "paid" | "refunded";
  invoiceError?: string;
  invoiceRefunded?: number; // cents recorded as refunded on the invoice
  refunded: number;
  status: "reserved" | "captured" | "released" | "delivered" | "claim" | "resolved";
  tracking?: string;
  error?: string;
};

export type Claim = {
  id: string;
  commitmentId: string;
  kind: "missing" | "damaged" | "short";
  units: number;
  note: string;
  hasPhoto?: boolean;
  priorStatus?: "captured" | "delivered";
  proposal?: { refund: number; reason: string };
  status: "open" | "approved" | "rejected";
};

export type Payout = { batchId: string; kind: "ship" | "holdback"; cents: number };

export type NegotiationTurn = {
  side: "shop" | "supplier";
  provider: "claude" | "gemini";
  move: "propose" | "accept" | "walk_away" | "none";
  price: number;
  message: string;
  verdict: "ok" | "rejected";
  reason?: string;
};

export type RoundState = {
  round: Round;
  commitments: Commitment[];
  claims: Claim[];
  negotiation: NegotiationTurn[];
  payouts: Payout[];
  holdbackLeft: number;
  agreedPrice?: number;
  closing?: boolean;
};

// shortcut: in-memory, single instance; move to Postgres (Render) if the demo needs to survive restarts.
const g = globalThis as unknown as { __shoal?: Map<string, RoundState> };
const store = (g.__shoal ??= new Map());

export function resetDemo(): void {
  for (const id of ROUND_IDS) store.set(id, seedRound(id));
}

export function getState(roundId: string): RoundState | undefined {
  if (ROUND_IDS.includes(roundId as RoundId) && !store.has(roundId)) store.set(roundId, seedRound(roundId as RoundId));
  return store.get(roundId);
}

export function unitsCommitted(s: RoundState): number {
  return s.commitments.reduce((n, c) => n + c.qty, 0);
}

export function addCommitment(
  s: RoundState,
  input: { shop: string; qty: number; simulated: boolean; orderId?: string; reserved?: number; payerEmail?: string; address?: string },
): Commitment {
  if (s.round.status !== "open" || s.closing) throw new Error("Round is not open");
  const err = validateQty(s.round, input.qty);
  if (err) throw new Error(err);
  const c: Commitment = {
    id: crypto.randomUUID(),
    shop: input.shop,
    qty: input.qty,
    reserved: input.reserved ?? reserveCents(s.round, unitsCommitted(s), input.qty),
    delivery: deliveryCents(s.round, input.qty),
    payerEmail: input.payerEmail,
    address: input.address,
    simulated: input.simulated,
    orderId: input.orderId,
    refunded: 0,
    status: "reserved",
  };
  s.commitments.push(c);
  return c;
}

export function findByOrder(s: RoundState, orderId: string): Commitment | undefined {
  return s.commitments.find((c) => c.orderId === orderId);
}

export function markAuthorized(s: RoundState, orderId: string, authorizationId: string): Commitment {
  const c = findByOrder(s, orderId);
  if (!c) throw new Error(`No commitment for order ${orderId}`);
  c.authorizationId ??= authorizationId;
  return c;
}

export function beginClose(s: RoundState): boolean {
  if (s.round.status !== "open" || s.closing) return false;
  s.closing = true;
  return true;
}
