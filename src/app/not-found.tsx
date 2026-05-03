import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-moss/80 mb-3">
        404
      </p>
      <h1 className="font-serif text-4xl">That page isn&apos;t on the shelf.</h1>
      <p className="mt-3 text-black/60">
        The link may be stale, or the product was removed from the open
        database.
      </p>
      <Link href="/" className="inline-block mt-6 pill hover:border-ink/40">
        ← Back to discovery
      </Link>
    </div>
  );
}
