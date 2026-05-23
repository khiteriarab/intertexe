export default function Loading() {
  return (
    <div className="py-16 md:py-24 flex flex-col items-center gap-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-56 bg-secondary/60 rounded-sm" />
      <div className="h-4 w-72 max-w-[90%] bg-secondary/40 rounded-sm" />
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-secondary/30" />
        ))}
      </div>
    </div>
  );
}
