"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  initialQuery,
  initialCategory,
}: {
  initialQuery: string;
  initialCategory: string;
}) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();
  const params = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (value.trim()) sp.set("q", value.trim());
    else sp.delete("q");
    sp.delete("page");
    if (initialCategory && initialCategory !== "all") {
      sp.set("category", initialCategory);
    }
    router.push(`/?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-xl" role="search">
      <label className="sr-only" htmlFor="q">
        Search products
      </label>
      <input
        id="q"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Try ‘oat milk’, ‘dark chocolate’, ‘nutella’…"
        className="flex-1 rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-moss/30 focus:border-moss"
      />
      <button
        type="submit"
        className="rounded-xl bg-ink text-cream px-5 text-[15px] font-medium hover:bg-moss transition-colors"
      >
        Search
      </button>
    </form>
  );
}
