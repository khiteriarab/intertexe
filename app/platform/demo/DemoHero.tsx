import Link from "next/link";
import { SERIF } from "../platform-ui";

export function DemoHero() {
  return (
    <section id="hero" className="demo-editorial-hero scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 pb-10 lg:pb-14">
        <div className="lg:grid lg:grid-cols-[minmax(0,32%)_minmax(0,68%)] lg:gap-8 xl:gap-10 lg:items-center">
          <div className="mb-10 lg:mb-0">
            <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--platform-quiet)] mb-6">Live demo</p>
            <h1
              className="text-[2.5rem] sm:text-[3.25rem] xl:text-[3.75rem] font-light leading-[1.04] tracking-[-0.02em] mb-5"
              style={SERIF}
            >
              From a tag to full transparency.
            </h1>
            <p className="text-[16px] sm:text-[17px] font-light leading-relaxed text-[var(--platform-muted)] max-w-md mb-8">
              See how INTERTEXE turns product data into a verified digital passport — and a richer customer experience.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
              <Link href="#passport" className="demo-editorial-btn-primary">
                See a live product →
              </Link>
              <Link href="#journey" className="demo-editorial-btn-text">
                Or explore the catalog
              </Link>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--platform-quiet)]">
              Real data / Real products / Real impact
            </p>
          </div>

          <figure className="demo-editorial-hero-art m-0 lg:-mr-4 xl:-mr-8">
            <img
              src="/platform/demo-hero-scanner.png"
              alt="INTERTEXE scanner app turning a garment tag into a digital product passport — from tag to passport, cleaner product data, better customer experience, and real sales potential"
              width={1672}
              height={941}
              className="demo-editorial-hero-art-image"
              loading="eager"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
