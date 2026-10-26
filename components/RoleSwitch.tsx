"use client";

import { useOptimistic, useTransition } from "react";
import { setRole } from "./role-action";

export type Role = "shop" | "supplier";
const ROLES: [Role, string][] = [["shop", "Shop"], ["supplier", "Supplier"]];

/** Switches the demo between a round's shop page and its supplier console (remembered in the `shoal-role` cookie). */
export default function RoleSwitch({ role, roundId }: { role: Role | null; roundId?: string }) {
  const [current, setCurrent] = useOptimistic<Role | null>(role);
  const [, startTransition] = useTransition();
  const pick = (r: Role) =>
    startTransition(async () => {
      setCurrent(r);
      await setRole(r, roundId); // sets the cookie and redirects to that role's view of the same round
    });
  return (
    <div role="group" aria-label="View as" className="inline-flex gap-0.5 rounded-pill bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-rule)]">
      {ROLES.map(([r, label]) => (
        <button
          key={r}
          type="button"
          aria-pressed={current === r}
          onClick={() => pick(r)}
          className={`rounded-pill px-3.5 py-1.5 text-sm transition-colors ${current === r ? "bg-tint font-semibold text-ink" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
