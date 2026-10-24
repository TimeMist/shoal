import { orders } from "@/lib/paypal";

export async function POST(_request: Request, ctx: RouteContext<"/api/orders/[id]/capture">) {
  const { id } = await ctx.params;
  const { result } = await orders().captureOrder({ id });
  return Response.json({ status: result.status });
}
