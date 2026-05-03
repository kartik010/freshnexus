import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  CATEGORIES,
  getProducts,
  searchProducts,
  type OFFProduct,
} from "@/lib/off";
import { FEATURED_BARCODES } from "@/lib/featured";
import SearchBar from "@/components/SearchBar";

export const metadata: Metadata = {
  title: "Discover fresh groceries",
  description:
    "Browse and search a live catalogue of grocery products. Filter by category, check nutrition grades, and dive into ingredients.",
  alternates: { canonical: "/" },
};

type Props = {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const category = sp.category ?? "all";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // Default landing view uses a curated barcode list fetched via the
  // per-product endpoint — far more reliable than the generic search
  // endpoint, which is aggressively rate-limited. A real query or category
  // filter falls through to the live search.
  let data: Awaited<ReturnType<typeof searchProducts>>;
  if (!q && category === "all" && page === 1) {
    const products = await getProducts(FEATURED_BARCODES);
    data = {
      ok: products.length > 0,
      products,
      count: products.length,
      page: 1,
      page_size: products.length,
    };
  } else {
    data = await searchProducts({
      q: q || "popular",
      category,
      page,
      pageSize: 24,
    });
  }

  return (
    <div>
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-moss/80 mb-3">
          Grocery Intelligence
        </p>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight max-w-3xl">
          A live, searchable window into the world&apos;s pantry.
        </h1>
        <p className="mt-4 max-w-2xl text-black/70">
          FreshNexus indexes crowdsourced product data from Open Food Facts so
          you can compare nutrition, provenance and processing scores in one
          place.
        </p>

        <div className="mt-7">
          <SearchBar initialQuery={q} initialCategory={category} />
        </div>

        <CategoryBar active={category} q={q} />
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-xl">
            {q ? `Results for "${q}"` : "Popular right now"}
            {category !== "all" && (
              <span className="text-black/50"> · {category}</span>
            )}
          </h2>
          <span className="text-sm text-black/50">
            {data.count.toLocaleString()} products indexed
          </span>
        </div>

        {data.products.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-black/70">
              {!data.ok
                ? "The Open Food Facts catalogue is temporarily unreachable. Give it a minute and refresh."
                : "Nothing matched. Try a broader term or a different category."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.products.map((p) => (
              <li key={p.code}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={data.page_size}
          total={data.count}
          q={q}
          category={category}
        />
      </section>
    </div>
  );
}

function CategoryBar({ active, q }: { active: string; q: string }) {
  return (
    <div className="mt-5 -mx-1 flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (c.slug !== "all") sp.set("category", c.slug);
        const href = `/?${sp.toString()}`;
        const isActive = active === c.slug;
        return (
          <Link
            key={c.slug}
            href={href}
            prefetch={false}
            className={
              "pill transition-colors " +
              (isActive
                ? "!bg-ink !text-cream !border-ink"
                : "hover:border-ink/40")
            }
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

function ProductCard({ product }: { product: OFFProduct }) {
  const img = product.image_front_url || product.image_url;
  const name = product.product_name?.trim() || "Unnamed product";
  const brand = product.brands?.split(",")[0]?.trim();
  const grade = product.nutrition_grades?.toUpperCase();

  return (
    <Link
      href={`/product/${product.code}`}
      className="card block p-3 hover:shadow-sm hover:border-ink/30 transition"
    >
      <div className="relative aspect-square rounded-lg bg-cream overflow-hidden border border-black/5">
        {img ? (
          <Image
            src={img}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-contain p-3"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-black/30 text-sm">
            no image
          </div>
        )}
        {grade && grade.length === 1 && (
          <span
            className="absolute top-2 left-2 h-7 w-7 rounded-full grid place-items-center text-xs font-semibold text-white"
            style={{ background: gradeColor(grade) }}
            aria-label={`Nutrition grade ${grade}`}
          >
            {grade}
          </span>
        )}
      </div>
      <div className="mt-3 px-1">
        <p className="text-[11px] uppercase tracking-wider text-black/50 truncate">
          {brand || "—"}
        </p>
        <p className="text-sm font-medium leading-snug line-clamp-2 mt-0.5">
          {name}
        </p>
      </div>
    </Link>
  );
}

function gradeColor(g: string) {
  switch (g) {
    case "A":
      return "#038141";
    case "B":
      return "#85bb2f";
    case "C":
      return "#fecb02";
    case "D":
      return "#ee8100";
    case "E":
      return "#e63e11";
    default:
      return "#888";
  }
}

function Pagination({
  page,
  pageSize,
  total,
  q,
  category,
}: {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  category: string;
}) {
  const totalPages = Math.min(40, Math.max(1, Math.ceil(total / pageSize)));
  if (totalPages <= 1) return null;
  const mk = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category && category !== "all") sp.set("category", category);
    sp.set("page", String(p));
    return `/?${sp.toString()}`;
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
      {page > 1 && (
        <Link className="pill hover:border-ink/40" href={mk(page - 1)}>
          ← Prev
        </Link>
      )}
      <span className="text-black/60 px-2">
        Page {page} of {totalPages}
      </span>
      {page < totalPages && (
        <Link className="pill hover:border-ink/40" href={mk(page + 1)}>
          Next →
        </Link>
      )}
    </nav>
  );
}
