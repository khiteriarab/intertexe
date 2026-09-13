import { SecondaryLink, SERIF } from "./platform-ui";
import { PLATFORM_LIVE_CATALOG } from "../../lib/enterprise/platform-showcase";

const STATS = [
  {
    value: `${PLATFORM_LIVE_CATALOG.avgNaturalFiberPct}%`,
    label: "Natural fiber recognition",
    detail: "Customer Zero catalog average",
  },
  {
    value: `${PLATFORM_LIVE_CATALOG.publishedPassports > 0 ? Math.round((PLATFORM_LIVE_CATALOG.publishedPassports / PLATFORM_LIVE_CATALOG.productCount) * 100) : 62}%`,
    label: "Catalogs passport-ready",
    detail: "Illustrative readiness from sample set",
  },
  {
    value: "1",
    label: "Platform",
    detail: "From data to consumer",
  },
] as const;

export function PlatformProofSection() {
  return (
    <section className="platform-proof-section itx-abstract-motif border-y border-[#e8e3da]/60 py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-center">
          <div className="relative rounded-2xl overflow-hidden min-h-[280px] lg:min-h-[360px]">
            <img
              src="/platform/hero-product-window.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#161513]/55 via-[#161513]/20 to-transparent" />
            <p className="absolute bottom-6 left-6 right-6 text-white text-[1.75rem] sm:text-[2.25rem] font-light leading-[1.1]" style={SERIF}>
              Better data.
              <br />A brighter future.
            </p>
          </div>
          <div>
            <p className="text-[15px] sm:text-[16px] text-[var(--platform-muted)] font-light leading-relaxed mb-8 max-w-lg">
              INTERTEXE turns complex product data into trusted records — so your team can move faster, publish with
              confidence, and lead in transparency.
            </p>
            <dl className="grid sm:grid-cols-3 gap-6 mb-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-[2rem] sm:text-[2.35rem] font-light text-[var(--platform-ink)] leading-none mb-2" style={SERIF}>
                    {stat.value}
                  </dt>
                  <dd className="text-[11px] tracking-[0.12em] uppercase text-[var(--platform-primary)] mb-1">{stat.label}</dd>
                  <dd className="text-xs text-[var(--platform-quiet)]">{stat.detail}</dd>
                </div>
              ))}
            </dl>
            <SecondaryLink href="/platform/demo">See it live</SecondaryLink>
          </div>
        </div>
      </div>
    </section>
  );
}
