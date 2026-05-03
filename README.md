# FreshNexus

A three-page grocery intelligence site built for the FreshNexus WebApp Challenge.
Live product data comes from [Open Food Facts](https://world.openfoodfacts.org),
and the Market Insights page pulls ECB exchange rates via
[Frankfurter](https://www.frankfurter.app).

## Stack

- Next.js 15 (App Router, React Server Components)
- TypeScript
- Tailwind CSS
- `next/image` for remote product photography

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To produce a production build:

```bash
npm run build
npm start
```

## The three pages

| Route                | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `/`                  | Discovery Hub — searchable catalogue with URL-driven category filters        |
| `/product/[code]`    | Product Intelligence — deep dive on nutrition, ingredients, labels           |
| `/insights`          | Market Insights — FX rates + 30-day EUR/USD trend; also the "About" section |

Category and search state live entirely in the URL (`?q=oat&category=beverages&page=2`),
so every filter is shareable, bookmarkable, and crawlable.

## Architectural notes

### SEO

- **Server Components everywhere for data fetching.** Product cards, the
  detail page and the insights page all render on the server. Search engines
  see fully-formed HTML with no client JS required.
- **Per-page metadata via `generateMetadata`.** The product detail page
  builds its `<title>`, `description`, and OpenGraph image from the actual
  Open Food Facts response. `alternates.canonical` is set on every page.
- **JSON-LD on product pages.** Each detail page emits a `Product` schema
  block (name, brand, image, GTIN, category) so the page is eligible for
  rich results.
- **Semantic HTML.** `<article>`, `<section>`, `<nav>`, `<dl>`, `<table>`
  are used where they actually make sense. Badges carry `aria-label`s where
  they replace text.
- **`next/image` with `remotePatterns`** for Open Food Facts CDNs — product
  images are optimised, lazy-loaded, and responsive via `sizes`.
- **`sitemap.ts` + `robots.ts`** are generated at the edge of the app.
- **Nutrition grade badge** is exposed both as background colour and as
  visible text, so assistive tech gets the grade and not just a colour.

### Data persistence & caching

This is a read-mostly public site, so I deliberately avoided a database:

- **Edge-cached fetches.** Both API wrappers use
  `fetch(url, { next: { revalidate: N } })`. The catalogue revalidates every
  5 minutes; product detail every 10 minutes; FX rates every hour (they
  only change once a day in practice).
- **URL is the source of truth for UI state.** No global store, no
  `localStorage`. This keeps pages stateless, linkable and easy to
  reason about when they stream from the server.
- **No auth / no user data.** If the assignment grew, I would add
  bookmarks in a Postgres table keyed by a cookie-issued `user_id`, with
  the product list read via a server action. The read path on product
  pages would still be unauthenticated so SEO indexing stays intact.

### Why Frankfurter and not a News API

Frankfurter is key-less, ECB-sourced, and historically reliable — important
when you don't want a demo to go red on the reviewer because of a 401.
A news API felt like fluff over a catalogue that is already about real
products; showing FX tied the second data source back to the shelf price
story told on the home page.

## What's intentionally out of scope

- No user accounts, no saved baskets.
- Category filter is limited to a curated top-level list; Open Food Facts
  taxonomy is multi-lingual and huge, and building a picker for it would
  outgrow the time-box.
- Pagination caps at 40 pages; the search API gets unreliable deep into
  the result set.

## File layout

```
src/
  app/
    layout.tsx               # shell + site-wide metadata
    page.tsx                 # Discovery Hub (Page 1)
    product/[code]/page.tsx  # Product Intelligence (Page 2)
    insights/page.tsx        # Market Insights (Page 3)
    robots.ts, sitemap.ts
  components/
    SearchBar.tsx            # the only client component
  lib/
    off.ts                   # Open Food Facts wrapper
    fx.ts                    # Frankfurter wrapper
```
