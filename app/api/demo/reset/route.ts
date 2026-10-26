import { getState, resetDemo } from "@/lib/store";
import { publicState } from "@/lib/privacy";
import { ROUND_IDS } from "@/lib/seed";

export async function POST() {
  resetDemo();
  return Response.json(Object.fromEntries(ROUND_IDS.map((id) => [id, publicState(getState(id)!)])));
}
