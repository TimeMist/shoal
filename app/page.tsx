import { catalog } from "@/lib/catalog";
import { Offer } from "./Offer";

export default function Home() {
  const product = catalog[0];
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{product.description}</p>
      <p className="text-2xl">${(product.rules.listPrice / 100).toFixed(2)}</p>
      <Offer productId={product.id} listPrice={product.rules.listPrice} />
    </main>
  );
}
