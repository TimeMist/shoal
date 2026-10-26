"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROUND_IDS, type RoundId } from "@/lib/seed";

// Keeps the round: /rounds/{id} ↔ /supplier/{id}; an unknown or missing round goes to the demo round.
export async function setRole(role: string, roundId?: string) {
  if (role !== "shop" && role !== "supplier") throw new Error("Unknown role");
  const id = ROUND_IDS.includes(roundId as RoundId) ? roundId : "demo";
  (await cookies()).set("shoal-role", role, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect(role === "shop" ? `/rounds/${id}` : `/supplier/${id}`);
}
