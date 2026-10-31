export const fail = (error: string, status: number) => Response.json({ error }, { status });

// Message only: PayPal SDK errors can carry request details we don't want to echo.
export const paypalFail = (e: unknown) => fail(e instanceof Error ? e.message : "PayPal error", 502);

export async function body(request: Request): Promise<Record<string, unknown>> {
  const b = await request.json().catch(() => null);
  return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
}

// A missing or invalid setting: the message is safe to show, the status says whose fault it is.
export class ConfigError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

// Each round pays its own supplier's sandbox account: SUPPLIER_PAYPAL_EMAIL_RECEIPTS for round "receipts",
// SUPPLIER_PAYPAL_EMAIL_DEMO for "demo" (oat milk). SUPPLIER_PAYPAL_EMAIL covers a round without its own.
export function roundSupplierEmail(roundId: string, env: Record<string, string | undefined> = process.env): string | undefined {
  return (env[`SUPPLIER_PAYPAL_EMAIL_${roundId.toUpperCase()}`] || env.SUPPLIER_PAYPAL_EMAIL)?.trim() || undefined;
}

export function supplierEmail(roundId: string): string {
  const e = roundSupplierEmail(roundId);
  if (!e) throw new ConfigError(`SUPPLIER_PAYPAL_EMAIL_${roundId.toUpperCase()} is not set`);
  return e;
}
