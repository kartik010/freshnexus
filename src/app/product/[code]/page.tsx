import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, type OFFProduct } from "@/lib/off";

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const product = await getProduct(code);
  if (!product) {
    return { title: "Product not found" };
  }
  const name = product.product_name || "Product";
  const brand = product.brands?.split(",")[0]?.trim();
  const titleBase = brand ? `${name} — ${brand}` : name;
  const desc =
    (product.ingredients_text?.slice(0, 155) ||
      `Nutrition, ingredients and market insight for ${name}.`) + "";

  return {
    title: titleBase,
    description: desc,
    alternates: { canonical: `/product/${code}` },
    openGraph: {
      title: titleBase,
      description: desc,
      type: "article",
      images: product.image_front_url ? [{ url: product.image_front_url }] : [],
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { code } = await params;
  const product = await getProduct(code);
  if (!product) notFound();

  const name = product.product_name?.trim() || "Unnamed product";
  const brand = product.brands?.split(",")[0]?.trim();
  const img = product.image_front_url || product.image_url;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    image: img ? [img] : undefined,
    description: product.ingredients_text?.slice(0, 300),
    gtin: product.code,
    category: product.categories?.split(",")[0]?.trim(),
  };

  return (
    <article className="max-w-5xl mx-auto px-5 py-10">
      <nav className="text-sm text-black/60 mb-6">
        <Link href="/" className="hover:text-moss">
          ← Back to discovery
        </Link>
      </nav>

      <div className="grid md:grid-cols-[1.1fr_1fr] gap-10">
        <div className="card p-6">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-cream">
            {img ? (
              <Image
                src={img}
                alt={name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-contain p-4"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-black/30">
                no image on file
              </div>
            )}
          </div>
        </div>

        <div>
          {brand && (
            <p className="text-xs uppercase tracking-[0.18em] text-moss/80">
              {brand}
            </p>
          )}
          <h1 className="font-serif text-3xl md:text-4xl mt-2 leading-tight">
            {name}
          </h1>
          {product.quantity && (
            <p className="mt-2 text-black/60">{product.quantity}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {product.nutrition_grades && (
              <Badge
                label={`Nutri-Score ${product.nutrition_grades.toUpperCase()}`}
              />
            )}
            {product.nova_group && (
              <Badge label={`NOVA group ${product.nova_group}`} />
            )}
            {product.ecoscore_grade && (
              <Badge
                label={`Eco-Score ${product.ecoscore_grade.toUpperCase()}`}
              />
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <Fact term="Barcode" value={product.code} />
            <Fact term="Serving" value={product.serving_size} />
            <Fact term="Countries" value={product.countries} />
            <Fact
              term="Category"
              value={product.categories?.split(",")[0]?.trim()}
            />
          </dl>

          {product.allergens_tags && product.allergens_tags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Allergens</h3>
              <ul className="flex flex-wrap gap-1.5">
                {product.allergens_tags.map((a) => (
                  <li key={a} className="pill !text-[11px]">
                    {stripLang(a)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section className="mt-10 grid md:grid-cols-2 gap-6">
        {product.ingredients_text && (
          <div className="card p-6">
            <h2 className="font-serif text-xl mb-3">Ingredients</h2>
            <p className="text-[15px] leading-relaxed text-black/80 whitespace-pre-line">
              {product.ingredients_text}
            </p>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-serif text-xl mb-3">Nutrition (per 100g)</h2>
          <NutritionTable product={product} />
        </div>
      </section>

      {product.labels_tags && product.labels_tags.length > 0 && (
        <section className="mt-6 card p-6">
          <h2 className="font-serif text-xl mb-3">Labels & claims</h2>
          <ul className="flex flex-wrap gap-2">
            {product.labels_tags.slice(0, 20).map((l) => (
              <li key={l} className="pill">
                {stripLang(l)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </article>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-moss/10 text-moss px-3 py-1 text-xs font-medium border border-moss/20">
      {label}
    </span>
  );
}

function Fact({ term, value }: { term: string; value?: string }) {
  return (
    <div className="hairline pb-2">
      <dt className="text-[11px] uppercase tracking-wider text-black/50">
        {term}
      </dt>
      <dd className="mt-1 truncate">{value || "—"}</dd>
    </div>
  );
}

function stripLang(tag: string) {
  // "en:palm-oil-free" -> "palm oil free"
  return tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ");
}

function NutritionTable({ product }: { product: OFFProduct }) {
  const n = product.nutriments || {};
  const rows: Array<[string, string | number | undefined, string]> = [
    ["Energy", n["energy-kcal_100g"] ?? n["energy_100g"], "kcal"],
    ["Fat", n["fat_100g"], "g"],
    ["— Saturated", n["saturated-fat_100g"], "g"],
    ["Carbohydrates", n["carbohydrates_100g"], "g"],
    ["— Sugars", n["sugars_100g"], "g"],
    ["Fiber", n["fiber_100g"], "g"],
    ["Proteins", n["proteins_100g"], "g"],
    ["Salt", n["salt_100g"], "g"],
  ];
  const has = rows.some(([, v]) => v !== undefined && v !== "");
  if (!has) {
    return <p className="text-sm text-black/60">No nutrition data provided.</p>;
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, val, unit]) => (
          <tr key={label} className="border-b border-black/5 last:border-0">
            <th className="text-left font-normal text-black/60 py-2">
              {label}
            </th>
            <td className="text-right py-2 tabular-nums">
              {val === undefined || val === "" ? "—" : `${val} ${unit}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
