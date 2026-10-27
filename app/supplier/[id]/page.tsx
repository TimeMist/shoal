import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Wordmark from "@/components/Wordmark";
import { getState } from "@/lib/store";
import SupplierConsole from "../SupplierConsole";
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
  const state = getState(id);
  if (!state) notFound();
  return <SupplierConsole id={id} initial={publicState(state)} accounts={sandboxAccounts()} />;
}

// Sandbox logins only (fake addresses), shown so the demo user knows which PayPal account plays which role.
function sandboxAccounts() {
  const env = process.env;
  const shops = (env.SHOP_PAYPAL_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  return { shoal: env.SHOAL_PAYPAL_EMAIL || undefined, supplier: env.SUPPLIER_PAYPAL_EMAIL || undefined, shops };
}
