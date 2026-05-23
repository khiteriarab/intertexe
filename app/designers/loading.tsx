export default function DesignersLoading() {
  return (
    <div className="py-12 flex flex-col items-center gap-8 max-w-6xl mx-auto px-4 animate-pulse" aria-busy="true">
      <div className="h-12 w-64 bg-secondary/50" />
      <div className="h-4 w-80 bg-secondary/30" />
      <div className="w-full h-12 bg-secondary/20" />
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-28 border border-border/20 bg-secondary/20" />
        ))}
      </div>
    </div>
  );
}
