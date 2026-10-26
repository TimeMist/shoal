import { deliver } from "@/lib/fulfil";
import { body, fail } from "@/lib/http";
import { getState } from "@/lib/store";
import { publicState } from "@/lib/privacy";

export async function POST(request: Request, ctx: RouteContext<"/api/rounds/[id]/deliver">) {
  const { id } = await ctx.params;
  const s = getState(id);
  if (!s) return fail("Round not found", 404);
  const { commitmentId } = await body(request);
  if (typeof commitmentId !== "string") return fail("commitmentId is required", 400);
  const r = deliver(s, commitmentId);
  return r.ok ? Response.json(publicState(s)) : fail(r.error, r.status);
}
