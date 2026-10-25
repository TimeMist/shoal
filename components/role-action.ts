"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const HOME = { shop: "/rounds/demo", supplier: "/supplier" } as const;

export async function setRole(role: string) {
  if (role !== "shop" && role !== "supplier") throw new Error("Unknown role");
  (await cookies()).set("shoal-role", role, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect(HOME[role]);
}
