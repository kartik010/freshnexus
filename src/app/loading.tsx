export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-16">
      <div className="h-8 w-60 bg-black/5 rounded-md animate-pulse" />
      <div className="mt-6 h-12 w-full max-w-xl bg-black/5 rounded-xl animate-pulse" />
      <ul className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="card p-3">
            <div className="aspect-square rounded-lg bg-black/5 animate-pulse" />
            <div className="h-3 w-2/3 bg-black/5 rounded mt-3 animate-pulse" />
            <div className="h-3 w-1/2 bg-black/5 rounded mt-2 animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
