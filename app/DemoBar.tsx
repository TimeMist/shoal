"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RoleSwitch, { type Role } from "@/components/RoleSwitch";
import { GHOST_SM } from "./ui";

/** Screens holding round data listen for this and refetch. */
export const RESET_EVENT = "shoal-reset";

/** The bar with the role read from the URL (needs a Suspense boundary under Cache Components). */
export default function RouteDemoBar() {
  const path = usePathname();
  const [, section, roundId] = path.split("/"); // "/rounds/{id}" or "/supplier/{id}"
  const role = section === "supplier" ? "supplier" : section === "rounds" ? "shop" : null;
  return <DemoBar key={path} role={role} roundId={role ? roundId : undefined} />;
}

/** One bar on every page: what's demo, which side you're viewing, and a way to start over. */
export function DemoBar({ role, roundId }: { role: Role | null; roundId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ text: string; failed?: boolean } | null>(null);

  useEffect(() => {
    if (!said || said.failed) return;
    const t = setTimeout(() => setSaid(null), 4000);
    return () => clearTimeout(t);
  }, [said]);

  async function reset() {
    setBusy(true);
    setSaid(null);
    try {
      const r = await fetch("/api/demo/reset", { method: "POST" });
      if (!r.ok) throw new Error();
      dispatchEvent(new Event(RESET_EVENT));
      router.refresh(); // server-rendered round data, like the landing page's open rounds
      setSaid({ text: "Demo reset." });
    } catch {
      setSaid({ text: "Couldn't reset the demo. Try again.", failed: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white shadow-base">
      <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-8 py-2 max-[900px]:px-4">
        <p className="text-[13px] text-muted">
          <b className="font-semibold text-ink">Demo data.</b> PayPal sandbox. Payouts stand in for PayPal multiparty in production.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className={`text-[13px] ${said?.failed ? "text-jam" : "text-muted"}`}>
            {said?.text}
          </p>
          <RoleSwitch role={role} roundId={roundId} />
          <button type="button" className={GHOST_SM} disabled={busy} aria-busy={busy || undefined} onClick={reset}>
            {busy ? "Resetting" : "Reset demo"}
          </button>
        </div>
      </div>
    </div>
  );
}
