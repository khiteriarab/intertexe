export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-100 aspect-[3/4] w-full mb-3" />
          <div className="bg-gray-100 h-3 w-16 mb-2" />
          <div className="bg-gray-100 h-3 w-24 mb-2" />
          <div className="bg-gray-100 h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
