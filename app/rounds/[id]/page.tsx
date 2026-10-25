import { notFound } from "next/navigation";
import { Suspense } from "react";
import DemoBadge from "@/components/DemoBadge";
import Swimmy from "@/components/Swimmy";
import { getState } from "@/lib/store";
import RoundScreen from "./RoundScreen";

export default function RoundPage({ params }: PageProps<"/rounds/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-8 py-6 max-[900px]:px-4">
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-xl font-bold tracking-[-0.02em]">
          <Swimmy size={28} />
          shoal
        </span>
        <DemoBadge />
      </header>
      <Suspense fallback={<p className="text-muted">Loading the round…</p>}>
        <Round params={params} />
      </Suspense>
    </main>
  );
}

async function Round({ params }: Pick<PageProps<"/rounds/[id]">, "params">) {
  const { id } = await params;
  const state = getState(id);
  if (!state) notFound();
  return <RoundScreen id={id} initial={state} />;
}
