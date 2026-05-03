import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-20 text-center">
      <h1 className="font-serif text-3xl">Product not found</h1>
      <p className="mt-2 text-black/60">
        That barcode isn&apos;t in the Open Food Facts database (or it was
        recently removed).
      </p>
      <Link
        href="/"
        className="inline-block mt-6 pill hover:border-ink/40"
      >
        ← Back to discovery
      </Link>
    </div>
  );
}
