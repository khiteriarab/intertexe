import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { fetchProductsByFiberAndCategory, fetchProductCount } from "../../lib/supabase-server";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Silk Clothing for Women",
  description: "Shop verified silk clothing for women. Real silk dresses, silk tops, silk blouses, and silk skirts — every product checked for genuine silk content.",
  alternates: { canonical: "https://www.intertexe.com/silk-clothing" },
};

export default async function SilkClothingPage() {
  const [products, productCount] = await Promise.all([
    fetchProductsByFiberAndCategory("silk", undefined, 48),
    fetchProductCount(),
  ]);
  const productsWithImages = products.filter(p => p.imageUrl);
  const displayCount = productCount > 0 ? productCount.toLocaleString() : "17,553";

  return (
    <div className="flex flex-col gap-0">
      <section className="py-10 md:py-16 text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/materials" className="hover:text-foreground transition-colors">Fabrics</Link>
          <span>/</span><span className="text-foreground">Silk Clothing</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif">Silk Clothing</h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">Real silk has a distinct, cool-to-the-touch feel that no synthetic can replicate. It&apos;s naturally temperature-regulating, hypoallergenic, and has a luminous drape that polyester satin will never match.</p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{displayCount} Verified Products</p>
      </section>

      <section className="flex flex-wrap gap-2 justify-center mb-8">
        {[
          { path: "/materials/silk-dresses", label: "Silk Dresses" },
          { path: "/materials/silk-tops", label: "Silk Tops" },
          { path: "/materials/silk-blouses", label: "Silk Blouses" },
          { path: "/materials/silk-skirts", label: "Silk Skirts" },
          { path: "/materials/silk-dresses-evening", label: "Silk Evening Dresses" },
        ].map(cat => (
          <Link key={cat.path} href={cat.path} className="px-4 py-2 border border-border/50 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">{cat.label}</Link>
        ))}
      </section>

      {productsWithImages.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-12 md:mb-16">
          {productsWithImages.slice(0, 24).map((product, i) => (
            <a key={product.id} href={product.url} target="_blank" rel="noopener noreferrer" className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col">
              <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                <img src={product.imageUrl} alt={`${product.name} by ${product.brandName}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                {product.naturalFiberPercent >= 90 && (<div className="absolute top-2 left-2"><span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">{product.naturalFiberPercent}% natural</span></div>)}
              </div>
              <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{product.brandName}</span>
                <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">{product.name}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
                <div className="flex items-center justify-between mt-auto pt-2"><span className="text-sm font-medium">{product.price}</span><ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" /></div>
              </div>
            </a>
          ))}
        </section>
      )}

      <section className="-mx-4 md:-mx-8 bg-[#111] text-white py-12 md:py-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif mb-8 md:mb-12 text-center">The INTERTEXE Buying Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><h3 className="text-xs uppercase tracking-[0.2em]">Look For</h3></div>
              <ul className="flex flex-col gap-2">
                <li className="text-[13px] text-white/60">100% mulberry silk — the highest quality silk fiber</li>
                <li className="text-[13px] text-white/60">Momme weight listed (19mm+ for clothing, 22mm+ for heavier drapes)</li>
                <li className="text-[13px] text-white/60">Silk charmeuse for dressy drape, crepe de chine for everyday</li>
                <li className="text-[13px] text-white/60">Grade 6A silk for the finest hand-feel</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><h3 className="text-xs uppercase tracking-[0.2em]">Avoid</h3></div>
              <ul className="flex flex-col gap-2">
                <li className="text-[13px] text-white/60">&quot;Silky&quot; or &quot;silk-feel&quot; fabrics — this means polyester</li>
                <li className="text-[13px] text-white/60">&quot;Satin&quot; without specifying silk — usually polyester satin</li>
                <li className="text-[13px] text-white/60">Art silk (artificial silk) — it&apos;s viscose</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><h3 className="text-xs uppercase tracking-[0.2em]">Red Flags</h3></div>
              <ul className="flex flex-col gap-2">
                <li className="text-[13px] text-white/60">Unusually low prices for silk garments — under $80 for a silk top</li>
                <li className="text-[13px] text-white/60">Shiny but plasticky hand-feel — real silk has a subtle luster</li>
                <li className="text-[13px] text-white/60">&quot;Satin&quot; listed as fiber content — satin is a weave, not a fiber</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6 text-center">Explore Other Fabrics</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[{ path: "/linen-clothing", label: "Linen" }, { path: "/cotton-clothing", label: "Cotton" }, { path: "/wool-clothing", label: "Wool" }, { path: "/cashmere-clothing", label: "Cashmere" }].map(page => (
            <Link key={page.path} href={page.path} className="px-5 py-2.5 border border-border/40 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">{page.label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
