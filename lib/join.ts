import { toMoney } from "./money.ts";

// The PayPal authorization must back exactly what the quote token promised, for this round.
export function authorizationMatches(
  auth: { amount: string; referenceId: string },
  quote: { roundId: string; reserved: number },
): boolean {
  return auth.amount === toMoney(quote.reserved) && auth.referenceId === quote.roundId;
}
