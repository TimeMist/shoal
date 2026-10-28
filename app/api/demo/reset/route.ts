import { getState, resetDemo } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import { publicState } from "@/lib/privacy";
import { ROUND_IDS } from "@/lib/seed";

export async function POST() {
  const v = await visitor();
  resetDemo(v);
  return Response.json(Object.fromEntries(ROUND_IDS.map((id) => [id, publicState(getState(id, v)!)])));
}
