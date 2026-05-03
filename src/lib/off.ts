// Thin wrapper around the Open Food Facts public search + product endpoints.
// The OFF cgi search is occasionally rate-limited (503) from cold caches,
// so we retry once and fall back to an empty page rather than throwing and
// 500-ing the whole route.

const BASE = "https://world.openfoodfacts.org";

// OFF asks that every client identify itself with a UA + contact.
const UA = "FreshNexus/0.1 (assignment - contact@freshnexus.local)";

const FIELDS = [
  "code",
  "product_name",
  "brands",
  "categories",
  "categories_tags",
  "image_front_url",
  "image_url",
  "nutrition_grades",
  "nova_group",
  "ecoscore_grade",
  "quantity",
  "countries",
  "ingredients_text",
  "nutriments",
  "labels_tags",
  "allergens_tags",
  "serving_size",
].join(",");

export type OFFProduct = {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  image_front_url?: string;
  image_url?: string;
  nutrition_grades?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  quantity?: string;
  countries?: string;
  ingredients_text?: string;
  serving_size?: string;
  labels_tags?: string[];
  allergens_tags?: string[];
  nutriments?: Record<string, number | string>;
};

export type SearchResult = {
  ok: boolean;
  products: OFFProduct[];
  count: number;
  page: number;
  page_size: number;
};

// A small in-memory cache keyed by URL. We deliberately do NOT use Next's
// fetch cache (`next: { revalidate }`) here because it will happily cache
// non-ok responses as well, which locks us into stale 503s when Open Food
// Facts throttles us. This gives us explicit "cache successes, retry
// failures" semantics.
type CacheEntry = { at: number; ttl: number; data: unknown };
const cache = new Map<string, CacheEntry>();

async function fetchJSON(url: string, ttlMs: number): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < hit.ttl) {
    return hit.data;
  }

  const MAX_ATTEMPTS = 4;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("json")) return null;
        const data = await res.json();
        cache.set(url, { at: Date.now(), ttl: ttlMs, data });
        return data;
      }
      if (res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        // Exponential backoff: 300ms, 700ms, 1500ms
        await new Promise((r) => setTimeout(r, 300 + attempt * 400));
        continue;
      }
      return null;
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 300 + attempt * 400));
        continue;
      }
    }
  }
  return null;
}

export async function searchProducts(opts: {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<SearchResult> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 24;

  const params = new URLSearchParams({
    search_terms: opts.q ?? "",
    page: String(page),
    page_size: String(pageSize),
    json: "1",
    fields: FIELDS,
    sort_by: "popularity_key",
  });

  if (opts.category && opts.category !== "all") {
    params.set("tagtype_0", "categories");
    params.set("tag_contains_0", "contains");
    params.set("tag_0", opts.category);
  }

  const url = `${BASE}/cgi/search.pl?${params.toString()}`;
  const data = (await fetchJSON(url, 5 * 60_000)) as {
    products?: OFFProduct[];
    count?: number;
    page?: number;
    page_size?: number;
  } | null;

  if (!data) {
    return { ok: false, products: [], count: 0, page, page_size: pageSize };
  }
  return {
    ok: true,
    products: (data.products ?? []) as OFFProduct[],
    count: Number(data.count ?? 0),
    page: Number(data.page ?? page),
    page_size: Number(data.page_size ?? pageSize),
  };
}

export async function getProduct(code: string): Promise<OFFProduct | null> {
  const url = `${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(FIELDS)}`;
  const data = (await fetchJSON(url, 10 * 60_000)) as
    | { status?: number; product?: OFFProduct }
    | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return data.product;
}

// Batch fetch — used to populate a curated home feed without relying on
// the rate-limited /cgi/search.pl endpoint. Kept low-concurrency on purpose:
// OFF gets unhappy when a single client opens a dozen simultaneous sockets.
export async function getProducts(codes: string[]): Promise<OFFProduct[]> {
  const out: OFFProduct[] = [];
  const missed: string[] = [];
  const concurrency = 3;
  for (let i = 0; i < codes.length; i += concurrency) {
    const batch = codes.slice(i, i + concurrency);
    const chunk = await Promise.all(batch.map((c) => getProduct(c)));
    chunk.forEach((p, idx) => {
      if (p) out.push(p);
      else missed.push(batch[idx]);
    });
  }
  // One quiet second pass to pick up anything OFF dropped on the floor.
  if (missed.length) {
    await new Promise((r) => setTimeout(r, 250));
    for (let i = 0; i < missed.length; i += concurrency) {
      const batch = missed.slice(i, i + concurrency);
      const chunk = await Promise.all(batch.map((c) => getProduct(c)));
      for (const p of chunk) if (p) out.push(p);
    }
  }
  return out;
}

// Categories shown in the UI. We deliberately only list categories that
// the snapshot actually has products for — a filter that returns an empty
// state every time is worse UX than one that isn't shown at all.
export const CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "chocolates", label: "Chocolate" },
  { slug: "spreads", label: "Spreads" },
  { slug: "biscuits", label: "Biscuits" },
  { slug: "snacks", label: "Snacks" },
  { slug: "beverages", label: "Beverages" },
  { slug: "breakfasts", label: "Breakfast" },
];
