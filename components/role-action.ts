"use server";

import { cookies } from "next/headers";

export async function setRole(role: string) {
  if (role !== "shop" && role !== "supplier") throw new Error("Unknown role");
  (await cookies()).set("shoal-role", role, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
