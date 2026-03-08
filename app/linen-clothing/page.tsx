import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { fetchProductsByFiberAndCategory, fetchProductCount } from "@/../../lib/supabase-server";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Linen Clothing for Women",
  description: "Shop verified linen clothing for women. Every product checked for real linen content — dresses, tops, pants, and more from brands that use genuine linen, not synthetic imitations.",
  alternates: { canonical: "https://www.intertexe.com/linen-clothing" },
};

export default async function LinenClothingPage() {
  const [products, productCount] = await Promise.all([
    fetchProductsByFiberAndCategory("linen", undefined, 48),
    fetchProductCount(),
  ]);
  const productsWithImages = products.filter(p => p.imageUrl);
  const displayCount = productCount > 0 ? productCount.toLocaleString() : "17,553";

  return (
    <div className="flex flex-col gap-0">
      <section className="py-10 md:py-16 text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/materials" className="hover:text-foreground transition-colors">Fabrics</Link>
          <span>/</span>
          <span className="text-foreground">Linen Clothing</span>
        </nav>
        <h1 className="text-3xl md:text-5xl font-serif">Linen Clothing</h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">Linen is the ultimate warm-weather fabric — breathable, naturally cooling, and it only gets softer with every wash. But most brands cut it with polyester. We verified every label to find the ones that don&apos;t.</p>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{displayCount} Verified Products</p>
      </section>

      <section className="flex flex-wrap gap-2 justify-center mb-8">
        {[
          { path: "/materials/linen-dresses", label: "Linen Dresses" },
          { path: "/materials/linen-tops", label: "Linen Tops" },
          { path: "/materials/linen-pants", label: "Linen Pants" },
          { path: "/materials/linen-shirts", label: "Linen Shirts" },
          { path: "/materials/linen-sets", label: "Linen Sets" },
        ].map(cat => (
          <Link key={cat.path} href={cat.path} className="px-4 py-2 border border-border/50 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
            {cat.label}
          </Link>
        ))}
      </section>

      {productsWithImages.length > 0 && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-12 md:mb-16">
          {productsWithImages.slice(0, 24).map((product, i) => (
            <a key={product.id} href={product.url} target="_blank" rel="noopener noreferrer" className="group bg-background border border-border/20 hover:border-border/60 transition-all flex flex-col">
              <div className="aspect-[3/4] bg-secondary relative overflow-hidden">
                <img src={product.imageUrl} alt={`${product.name} by ${product.brandName}`} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                {product.naturalFiberPercent >= 90 && (
                  <div className="absolute top-2 left-2"><span className="bg-emerald-900/90 text-emerald-100 px-2 py-0.5 text-[8px] uppercase tracking-[0.1em] font-medium backdrop-blur-sm">{product.naturalFiberPercent}% natural</span></div>
                )}
              </div>
              <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{product.brandName}</span>
                <h3 className="text-xs md:text-sm leading-snug font-medium line-clamp-2">{product.name}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{product.composition}</p>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-sm font-medium">{product.price}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
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
                <li className="text-[13px] text-white/60 leading-relaxed">100% linen or linen-dominant blends (70%+ linen)</li>
                <li className="text-[13px] text-white/60 leading-relaxed">European flax — Belgian, French, or Irish linen is the gold standard</li>
                <li className="text-[13px] text-white/60 leading-relaxed">Pre-washed or garment-dyed linen for minimal shrinkage</li>
                <li className="text-[13px] text-white/60 leading-relaxed">Heavier weight (170–250 GSM) for structure and opacity</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><h3 className="text-xs uppercase tracking-[0.2em]">Avoid</h3></div>
              <ul className="flex flex-col gap-2">
                <li className="text-[13px] text-white/60 leading-relaxed">Linen/polyester blends — defeats the purpose of linen&apos;s breathability</li>
                <li className="text-[13px] text-white/60 leading-relaxed">&quot;Linen look&quot; or &quot;linen style&quot; fabrics — always synthetic</li>
                <li className="text-[13px] text-white/60 leading-relaxed">Over-processed linen that feels papery or stiff</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><h3 className="text-xs uppercase tracking-[0.2em]">Red Flags</h3></div>
              <ul className="flex flex-col gap-2">
                <li className="text-[13px] text-white/60 leading-relaxed">Linen that doesn&apos;t wrinkle at all — it&apos;s treated with chemicals or blended</li>
                <li className="text-[13px] text-white/60 leading-relaxed">Very low prices — real linen is labor-intensive to produce</li>
                <li className="text-[13px] text-white/60 leading-relaxed">&quot;Ramie&quot; sold as linen — similar but inferior fiber</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6 text-center">Explore Other Fabrics</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { path: "/silk-clothing", label: "Silk" },
            { path: "/cotton-clothing", label: "Cotton" },
            { path: "/wool-clothing", label: "Wool" },
            { path: "/cashmere-clothing", label: "Cashmere" },
          ].map(page => (
            <Link key={page.path} href={page.path} className="px-5 py-2.5 border border-border/40 text-xs uppercase tracking-[0.15em] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
              {page.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
