import { cookies } from "next/headers";

export const VISITOR_COOKIE = "shoal_visitor";

// proxy.ts sets the cookie on every request, so "shared" only covers a request that bypassed it.
export async function visitor(): Promise<string> {
  return (await cookies()).get(VISITOR_COOKIE)?.value ?? "shared";
}
