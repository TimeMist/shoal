import Link from "next/link";
import Swimmy from "./Swimmy";

/** The small dot mark and "shoal", linking home. */
export default function Wordmark() {
  return (
    <Link href="/" className="flex w-fit items-center gap-2 font-display text-xl font-bold tracking-[-0.02em] text-ink no-underline hover:text-ink">
      <Swimmy size={28} />
      shoal
    </Link>
  );
}
