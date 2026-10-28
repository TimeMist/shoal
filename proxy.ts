import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { VISITOR_COOKIE } from "./lib/visitor";

// Gives each browser its own demo rounds. The cookie is also added to this request, so the first page already uses it.
export function proxy(request: NextRequest) {
  if (request.cookies.has(VISITOR_COOKIE)) return NextResponse.next();
  const id = crypto.randomUUID();
  request.cookies.set(VISITOR_COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set({ name: VISITOR_COOKIE, value: id, path: "/", httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });
  return response;
}

export const config = { matcher: ["/((?!_next/|icon.svg|favicon.ico).*)"] };
