import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Consumer homepage bridge to the B2B textile intelligence platform */
export function IntelligenceForBrandsStrip() {
  return (
    <section
      className="border-t border-neutral-200/70 bg-[#152238] text-white"
      data-testid="section-intelligence-for-brands"
    >
      <div className="max-w-5xl mx-auto py-12 md:py-16 px-6 md:px-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="max-w-xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45 mb-3">For brands</p>
          <h2 className="text-[22px] md:text-[28px] font-serif font-light leading-snug">
            The fashion brand sits on proprietary textile intelligence.
          </h2>
          <p className="text-sm text-white/65 mt-4 leading-relaxed font-light">
            INTERTEXE verifies composition for shoppers — and turns that same material graph into digital product
            passports, consumer signals, and peer benchmarking for fashion businesses.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            href="/platform"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#152238] px-8 py-3.5 uppercase tracking-[0.18em] text-[10px] font-medium hover:bg-white/90 transition-colors"
            data-testid="link-platform-brands"
          >
            Material intelligence <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/platform/demo"
            className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-3.5 uppercase tracking-[0.18em] text-[10px] font-medium hover:bg-white/10 transition-colors"
            data-testid="link-platform-demo"
          >
            Live demo
          </Link>
        </div>
      </div>
    </section>
  );
}
