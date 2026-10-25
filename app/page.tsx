import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">Shoal</h1>
      <Link href="/rounds/demo" className="underline">
        Open the demo round
      </Link>
    </main>
  );
}
