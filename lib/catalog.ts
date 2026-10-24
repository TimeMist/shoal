import type { Rules } from "./rules";

export type Product = { id: string; name: string; description: string; rules: Rules };

// shortcut: hardcoded demo catalog, move to a database when the merchant rules editor lands.
export const catalog: Product[] = [
  {
    id: "espresso-grinder",
    name: "Burr Espresso Grinder",
    description: "Stepless burr grinder, 64mm flat burrs, last season's colourway.",
    rules: { listPrice: 24900, floorPrice: 19900, maxDiscountPct: 18, sweeteners: ["free-shipping", "bag-of-beans"] },
  },
];

export function findProduct(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}
