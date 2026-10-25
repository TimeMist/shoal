import type { Commitment } from "@/lib/store";

export type ChipStatus = Commitment["status"] | "open" | "shipped";

const CHIP: Record<ChipStatus, [word: string, colour: string]> = {
  reserved: ["Reserved", "bg-supplier-tint text-plum"],
  open: ["Round open", "bg-live-tint text-live"],
  captured: ["Captured", "bg-settled-tint text-leaf-ink"],
  shipped: ["Out for delivery", "bg-live-tint text-live"],
  delivered: ["Delivered", "bg-settled-tint text-leaf-ink"],
  claim: ["Claim open", "bg-claim-tint text-jam"],
  resolved: ["Resolved", "bg-settled-tint text-leaf-ink"],
  released: ["Released", "bg-released-tint text-muted"],
};

/** Where the money is, as colour and a word. */
export default function StatusChip({ status }: { status: ChipStatus }) {
  const [word, colour] = CHIP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-[13px] font-semibold ${colour}`}>
      <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
      {word}
    </span>
  );
}
