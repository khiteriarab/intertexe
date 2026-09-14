import Link from "next/link";
import { SERIF } from "../platform-ui";
import { ApiDocsHeroVisual } from "./ApiDocsHeroVisual";

export function ApiDocsHero() {
  return (
    <section className="api-editorial-hero scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-10 lg:pb-14">
        <div className="lg:grid lg:grid-cols-[minmax(0,40%)_minmax(0,60%)] lg:gap-10 xl:gap-14 lg:items-center">
          <div className="mb-10 lg:mb-0">
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6">
              Material Intelligence API
            </p>
            <h1
              className="text-[2.35rem] sm:text-[3rem] xl:text-[3.5rem] font-light leading-[1.05] tracking-[-0.02em] mb-5"
              style={SERIF}
            >
              Governed material intelligence, available by API.
            </h1>
            <p className="text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] max-w-md mb-8">
              Resolve a GTIN or product identity into normalized fibre composition, evidence status and
              DPP-readiness signals. Build with the same trusted data infrastructure used by global fashion
              brands.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link href="#quickstart" className="api-editorial-btn-primary">
                Try live lookup →
              </Link>
              <Link href="/api/openapi.json" className="api-editorial-btn-outline">
                Download OpenAPI 3.1
              </Link>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-quiet)] max-w-sm leading-relaxed">
              Real products · Trusted data · A more transparent fashion industry
            </p>
          </div>

          <ApiDocsHeroVisual />
        </div>
      </div>
    </section>
  );
}
