import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Wordmark from "@/components/Wordmark";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import SupplierConsole, { type SandboxAccounts } from "../SupplierConsole";
import { roundSupplierEmail } from "@/lib/http";
import { publicState } from "@/lib/privacy";

export const metadata: Metadata = { title: "Supplier console · Shoal" };

export default function SupplierPage({ params }: PageProps<"/supplier/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-8 py-6 max-[900px]:px-4">
      <header>
        <Wordmark />
      </header>
      <Suspense fallback={<p className="text-muted">Loading the round…</p>}>
        <Console params={params} />
      </Suspense>
    </main>
  );
}

async function Console({ params }: Pick<PageProps<"/supplier/[id]">, "params">) {
  await connection(); // the round lives in memory: render per request, never at build time
  const { id } = await params;
  const state = getState(id, await visitor());
  if (!state) notFound();
  return <SupplierConsole id={id} initial={publicState(state)} accounts={sandboxAccounts(id)} />;
}

// Public sandbox logins only: the shop buyer and this round's supplier, each shown when its password is set.
// Shoal's own platform account (it captures, refunds and pays out) is never listed.
function sandboxAccounts(roundId: string): SandboxAccounts {
  const env = process.env;
  const login = (email?: string, password?: string) => (email?.trim() && password ? { email: email.trim(), password } : undefined);
  return {
    buyer: login(env.NEXT_PUBLIC_SANDBOX_BUYER_EMAIL, env.NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD),
    supplier: login(roundSupplierEmail(roundId), env.SANDBOX_SUPPLIER_PASSWORD),
  };
}
