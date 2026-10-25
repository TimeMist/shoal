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
