// Frankfurter is a free, no-key ECB-backed FX API.
// https://www.frankfurter.app/docs/

export type FxResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

type CacheEntry = { at: number; ttl: number; data: unknown };
const cache = new Map<string, CacheEntry>();

async function fxFetch<T>(url: string, ttlMs: number): Promise<T | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data as T;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    cache.set(url, { at: Date.now(), ttl: ttlMs, data });
    return data;
  } catch {
    return null;
  }
}

export async function getLatestRates(
  base = "EUR",
  symbols: string[] = ["USD", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "CNY", "BRL", "ZAR"],
): Promise<FxResponse | null> {
  const url = `https://api.frankfurter.app/latest?from=${base}&to=${symbols.join(",")}`;
  return fxFetch<FxResponse>(url, 60 * 60_000);
}

export type FxHistory = {
  start: string;
  end: string;
  points: Array<{ date: string; value: number }>;
};

export async function getHistory(
  base = "EUR",
  to = "USD",
): Promise<FxHistory | null> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=${base}&to=${to}`;
  const data = await fxFetch<{ rates: Record<string, Record<string, number>> }>(
    url,
    60 * 60_000,
  );
  if (!data) return null;
  const points = Object.entries(data.rates)
    .map(([date, r]) => ({ date, value: r[to] }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { start: fmt(start), end: fmt(end), points };
}
