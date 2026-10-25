/** Integer cents to a PayPal amount string: 25920 -> "259.20". */
export function toMoney(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error(`Cents must be an integer, got ${cents}`);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Integer cents to display text: 266400 -> "$2,664.00". */
export function formatUSD(cents: number): string {
  return `$${Number(toMoney(cents)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}
