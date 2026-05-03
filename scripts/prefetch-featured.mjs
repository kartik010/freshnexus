// One-off script: walks the curated barcode list, pulls each product from
// Open Food Facts, and writes the result to src/data/featured.json. This
// lets the home page render from a local snapshot instead of fanning out
// 25 requests to OFF at runtime (which is painfully slow when their search
// infra is rate-limited).
//
// Run:  node scripts/prefetch-featured.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "data", "featured.json");

const BARCODES = [
  // sweet-spreads / breakfasts
  "3017620422003", "3017620425035", "3017620429484", "80177173", "4008400402222",
  // biscuits / snacks
  "7622210449283", "3017624010701", "8000500310427", "3033710065080", "3017800043219",
  // chocolates / candies
  "4000417025005", "5000159407236", "4902777021843", "40084077",
  // beverages
  "5449000000996", "5449000054227", "5449000011527", "7613033264153", "4056489515623",
  // dairy
  "3033490004743", "3033710074617", "3175681881242",
  // sauces / condiments
  "8076809513753", "8712423011014",
  // bread / cereals
  "3228857000746", "7622210770233",
];

const FIELDS = [
  "code", "product_name", "brands", "categories", "categories_tags",
  "image_front_url", "image_url", "nutrition_grades", "nova_group",
  "ecoscore_grade", "quantity", "countries", "ingredients_text",
  "nutriments", "labels_tags", "allergens_tags", "serving_size",
].join(",");

const UA = "FreshNexus/0.1 (prefetch-script - contact@freshnexus.local)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.status === 1 && data.product) return data.product;
        return null;
      }
      if (res.status >= 500) {
        await sleep(500 + attempt * 500);
        continue;
      }
      return null;
    } catch {
      await sleep(500 + attempt * 500);
    }
  }
  return null;
}

// Read existing snapshot so we can merge — OFF is flaky enough that any
// one run might miss half the list. Re-running the script fills holes
// without clobbering previously successful fetches.
let existing = [];
try {
  existing = JSON.parse(await readFile(OUT, "utf8"));
} catch {}
const byCode = new Map(existing.map((p) => [p.code, p]));
const missing = BARCODES.filter((c) => !byCode.has(c));
console.log(`Have ${byCode.size} cached; fetching ${missing.length} missing…`);

for (const code of missing) {
  process.stdout.write(`  ${code}`);
  const p = await fetchOne(code);
  if (p) {
    byCode.set(p.code, p);
    console.log(`  ✓ ${p.product_name ?? "(unnamed)"}`);
  } else {
    console.log("  ✗ failed");
  }
  await sleep(300);
}

const out = Array.from(byCode.values());
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`\nWrote ${out.length} products to ${OUT}`);
