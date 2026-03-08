import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-32 text-center">
      <span className="text-8xl md:text-[120px] font-serif text-foreground/10 leading-none mb-4">404</span>
      <h1 className="text-2xl md:text-4xl font-serif mb-4" data-testid="text-not-found-title">Page Not Found</h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-md mb-8 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to exploring natural fabrics.
      </p>
      <div className="flex flex-col md:flex-row gap-4">
        <Link href="/" className="bg-foreground text-background px-6 py-3 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground/90 transition-colors" data-testid="link-home">
          Go Home
        </Link>
        <Link href="/materials" className="border border-foreground px-6 py-3 uppercase tracking-[0.15em] text-xs font-medium hover:bg-foreground hover:text-background transition-colors" data-testid="link-browse-fabrics">
          Browse Fabrics
        </Link>
      </div>
    </div>
  );
}
