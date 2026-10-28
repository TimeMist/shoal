import { notFound } from "next/navigation";
import { Suspense } from "react";
import Wordmark from "@/components/Wordmark";
import { getState } from "@/lib/store";
import { visitor } from "@/lib/visitor";
import RoundScreen from "./RoundScreen";
import { publicState } from "@/lib/privacy";

export default function RoundPage({ params }: PageProps<"/rounds/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-8 py-6 max-[900px]:px-4">
      <header>
        <Wordmark />
      </header>
      <Suspense fallback={<p className="text-muted">Loading the round…</p>}>
        <Round params={params} />
      </Suspense>
    </main>
  );
}

async function Round({ params }: Pick<PageProps<"/rounds/[id]">, "params">) {
  const { id } = await params;
  const state = getState(id, await visitor());
  if (!state) notFound();
  return <RoundScreen id={id} initial={publicState(state)} />;
}
