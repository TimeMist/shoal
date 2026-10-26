import { toMoney } from "./money.ts";

const usd = (cents: number) => ({ currencyCode: "USD", value: toMoney(cents) });

// PayPal order amount: goods as item_total, delivery as shipping; value is their sum.
export function orderAmount(goods: number, delivery: number) {
  return { ...usd(goods + delivery), breakdown: { itemTotal: usd(goods), shipping: usd(delivery) } };
}

// The PayPal authorization must back exactly what the quote token promised, for this round.
export function authorizationMatches(
  auth: { amount: string; referenceId: string },
  quote: { roundId: string; reserved: number },
): boolean {
  return auth.amount === toMoney(quote.reserved) && auth.referenceId === quote.roundId;
}
