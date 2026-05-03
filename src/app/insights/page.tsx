import type { Metadata } from "next";
import { getLatestRates, getHistory } from "@/lib/fx";

export const metadata: Metadata = {
  title: "Market Insights",
  description:
    "Live FX rates and a 30-day trend for the Euro versus the US dollar — a quick read on import costs for the FreshNexus catalogue.",
  alternates: { canonical: "/insights" },
};

// Format helpers kept inline — nothing exotic.
const nf = (n: number, digits = 4) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits });

export default async function InsightsPage() {
  const [latest, history] = await Promise.all([
    getLatestRates("EUR"),
    getHistory("EUR", "USD"),
  ]);

  const values = history?.points.map((p) => p.value) ?? [];
  const hasHistory = values.length > 1;
  const min = hasHistory ? Math.min(...values) : 0;
  const max = hasHistory ? Math.max(...values) : 0;
  const first = hasHistory ? values[0] : 0;
  const last = hasHistory ? values[values.length - 1] : 0;
  const pct = hasHistory ? ((last - first) / first) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-12">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-moss/80 mb-3">
          Market Insights
        </p>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
          Why FreshNexus watches currencies as closely as carbs.
        </h1>
        <p className="mt-4 max-w-2xl text-black/70">
          Grocery supply chains are wildly international. A 2% swing in
          EUR/USD can move the shelf price of imported olive oil long before
          any retailer updates a tag. This page pulls live data from the ECB
          via Frankfurter and pairs it with the Open Food Facts catalogue you
          saw on the home page.
        </p>
      </section>

      {hasHistory && history ? (
        <section className="card p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-2xl">EUR / USD · last 30 days</h2>
              <p className="text-sm text-black/60">
                {history.start} → {history.end}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-serif tabular-nums">{nf(last, 4)}</p>
              <p
                className={
                  "text-sm font-medium " +
                  (pct >= 0 ? "text-moss" : "text-red-600")
                }
              >
                {pct >= 0 ? "▲" : "▼"} {nf(Math.abs(pct), 2)}% vs 30d ago
              </p>
            </div>
          </div>

          <Sparkline points={values} min={min} max={max} />

          <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
            <Stat label="30d low" value={nf(min, 4)} />
            <Stat label="30d high" value={nf(max, 4)} />
            <Stat label="Range" value={nf(max - min, 4)} />
          </div>
        </section>
      ) : (
        <section className="card p-8 text-center text-black/60">
          Live currency feed is currently unavailable. Refresh in a moment.
        </section>
      )}

      {latest && (
        <section>
          <h2 className="font-serif text-2xl mb-4">1 {latest.base} buys…</h2>
          <ul className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(latest.rates).map(([code, value]) => (
              <li key={code} className="card p-4">
                <p className="text-[11px] uppercase tracking-wider text-black/50">
                  {code}
                </p>
                <p className="mt-1 text-lg font-serif tabular-nums">
                  {nf(value, 3)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-black/50">
            Reference rates published by the European Central Bank on{" "}
            {latest.date}.
          </p>
        </section>
      )}

      <section className="card p-6 md:p-8">
        <h2 className="font-serif text-2xl mb-3">About FreshNexus</h2>
        <div className="prose prose-sm max-w-none text-black/80 leading-relaxed space-y-3">
          <p>
            FreshNexus is a small experiment in making commodity-grade product
            data feel useful. Every product page is rendered on the server so
            search engines — and shoppers on slow networks — get readable HTML
            before JavaScript even starts.
          </p>
          <p>
            We lean on two open data sources: Open Food Facts for product and
            nutrition information, and the European Central Bank (through
            Frankfurter) for exchange rates. No API keys, no vendor lock-in.
          </p>
          <p>
            This build is part of a 4-hour assessment, so you&apos;ll notice
            where features stop short: there&apos;s no account system, no
            price tracking, and category filtering relies on Open Food
            Facts&apos; own taxonomy. Everything else is intentionally small
            and legible.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline pb-2">
      <p className="text-[11px] uppercase tracking-wider text-black/50">
        {label}
      </p>
      <p className="mt-1 font-serif text-lg tabular-nums">{value}</p>
    </div>
  );
}

function Sparkline({
  points,
  min,
  max,
}: {
  points: number[];
  min: number;
  max: number;
}) {
  const W = 800;
  const H = 180;
  const pad = 10;
  const span = max - min || 1;
  const step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area =
    path +
    ` L ${coords[coords.length - 1][0].toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-44"
      role="img"
      aria-label="30 day EUR/USD sparkline"
    >
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2f6f4e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2f6f4e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} fill="none" stroke="#2f6f4e" strokeWidth="2" />
      {coords.map(([x, y], i) =>
        i === coords.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#2f6f4e" />
        ) : null,
      )}
    </svg>
  );
}
