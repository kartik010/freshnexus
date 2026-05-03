// Snapshot of curated Open Food Facts products, pre-fetched at build time
// via `node scripts/prefetch-featured.mjs`. Using a baked JSON file means
// the home page and category filters render instantly — OFF's live search
// endpoint is aggressively rate-limited, and baking the common case makes
// the site feel like a grocery app instead of an unreliable proxy.

import raw from "@/data/featured.json";
import type { OFFProduct } from "./off";

export const FEATURED_PRODUCTS = raw as unknown as OFFProduct[];

// Map from category-slug-in-URL to the substring we look for inside each
// product's `categories_tags`. Kept small on purpose: every entry below
// must have at least a couple of matching products in the snapshot.
export const CATEGORY_MATCHERS: Record<string, string[]> = {
  chocolates: ["chocolate", "cocoa"],
  spreads: ["spread", "pate-a-tartiner"],
  snacks: ["snack"],
  beverages: ["beverage", "soda", "cola", "drink"],
  biscuits: ["biscuit"],
  breakfasts: ["breakfast"],
};

export function filterByCategory(
  products: OFFProduct[],
  category: string,
): OFFProduct[] {
  if (category === "all") return products;
  const needles = CATEGORY_MATCHERS[category];
  if (!needles) return [];
  return products.filter((p) =>
    (p.categories_tags || []).some((t) => {
      const clean = t.toLowerCase().replace(/^[a-z]{2}:/, "");
      return needles.some((n) => clean.includes(n));
    }),
  );
}
