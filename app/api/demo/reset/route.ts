import { getState, resetDemo } from "@/lib/store";
import { publicState } from "@/lib/privacy";

export async function POST() {
  resetDemo();
  return Response.json(publicState(getState("demo")!));
}
