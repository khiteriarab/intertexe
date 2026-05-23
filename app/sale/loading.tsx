export default function SaleLoading() {
  return (
    <div className="py-16 flex flex-col items-center gap-10 animate-pulse" aria-busy="true">
      <div className="h-12 w-72 bg-secondary/50" />
      <div className="h-4 w-48 bg-secondary/30" />
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-secondary/30" />
        ))}
      </div>
    </div>
  );
}
