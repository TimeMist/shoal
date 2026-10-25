import { getState, resetDemo } from "@/lib/store";

export async function POST() {
  resetDemo();
  return Response.json(getState("demo"));
}
