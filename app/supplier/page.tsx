import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Wordmark from "@/components/Wordmark";
import { getState } from "@/lib/store";
import SupplierConsole from "./SupplierConsole";

export const metadata: Metadata = { title: "Supplier console · Shoal" };

export default function SupplierPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-8 py-6 max-[900px]:px-4">
      <header>
        <Wordmark />
      </header>
      <Suspense fallback={<p className="text-muted">Loading the round…</p>}>
        <Console />
      </Suspense>
    </main>
  );
}

async function Console() {
  await connection(); // the round lives in memory: render per request, never at build time
  const state = getState("demo")!;
  return <SupplierConsole id="demo" initial={state} />;
}
