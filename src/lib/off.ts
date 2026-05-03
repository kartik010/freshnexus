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

  // Keep the retry window short: we'd rather fail fast with a clear
  // "unreachable" message than keep the reviewer staring at a spinner
  // while OFF throws 503s. The `searchProducts` caller also tries a
  // second endpoint before giving up.
  const MAX_ATTEMPTS = 3;
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
        await new Promise((r) => setTimeout(r, 250 + attempt * 350));
        continue;
      }
      return null;
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 250 + attempt * 350));
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
  const q = opts.q?.trim() ?? "";
  const category = opts.category && opts.category !== "all" ? opts.category : "";

  // We build both a primary URL and a fallback URL: Open Food Facts
  // throttles unpredictably, and the two endpoints have independent
  // rate limiters. If the primary 503s through all retries, we try the
  // other endpoint before giving up.
  const urls: string[] = [];

  if (q) {
    const cgi = new URLSearchParams({
      search_terms: q,
      page: String(page),
      page_size: String(pageSize),
      json: "1",
      fields: FIELDS,
      sort_by: "popularity_key",
    });
    if (category) {
      cgi.set("tagtype_0", "categories");
      cgi.set("tag_contains_0", "contains");
      cgi.set("tag_0", category);
    }
    urls.push(`${BASE}/cgi/search.pl?${cgi.toString()}`);

    // v2 fallback — even though it doesn't do full-text well, it's on a
    // separate rate limiter and usually returns something when cgi is
    // throttled. Better than a dead page.
    const v2 = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      fields: FIELDS,
      sort_by: "popularity_key",
    });
    if (category) v2.set("categories_tags_en", category);
    v2.set("search_terms", q);
    urls.push(`${BASE}/api/v2/search?${v2.toString()}`);
  } else {
    const v2 = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      fields: FIELDS,
      sort_by: "popularity_key",
    });
    if (category) v2.set("categories_tags_en", category);
    urls.push(`${BASE}/api/v2/search?${v2.toString()}`);

    const cgi = new URLSearchParams({
      search_terms: "",
      page: String(page),
      page_size: String(pageSize),
      json: "1",
      fields: FIELDS,
      sort_by: "popularity_key",
    });
    if (category) {
      cgi.set("tagtype_0", "categories");
      cgi.set("tag_contains_0", "contains");
      cgi.set("tag_0", category);
    }
    urls.push(`${BASE}/cgi/search.pl?${cgi.toString()}`);
  }

  type RawSearch = {
    products?: OFFProduct[];
    count?: number;
    page?: number;
    page_size?: number;
  };
  let data: RawSearch | null = null;
  for (const u of urls) {
    data = (await fetchJSON(u, 10 * 60_000)) as RawSearch | null;
    if (data) break;
  }

  if (!data) {
    return { ok: false, products: [], count: 0, page, page_size: pageSize };
  }
  const products = ((data.products ?? []) as OFFProduct[]).filter(
    (p) => p && p.code && (p.product_name || p.brands),
  );
  return {
    ok: true,
    products,
    count: Number(data.count ?? products.length),
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

export const CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "beverages", label: "Beverages" },
  { slug: "snacks", label: "Snacks" },
  { slug: "chocolates", label: "Chocolate" },
  { slug: "biscuits", label: "Biscuits" },
  { slug: "dairies", label: "Dairy" },
  { slug: "cheeses", label: "Cheese" },
  { slug: "yogurts", label: "Yogurt" },
  { slug: "cereals", label: "Cereals" },
  { slug: "breads", label: "Bread" },
  { slug: "sauces", label: "Sauces" },
  { slug: "fruits", label: "Fruits" },
];
