import Link from "next/link";
import Image from "next/image";
import { WhatItIsProcessVisual } from "./b2b-visuals/WhatItIsProcessVisual";
import { PlatformProductPillarsVisual } from "./b2b-visuals/PlatformProductPillarsVisual";
import { PlatformCapabilityNav } from "./PlatformCapabilityNav";
import { getEnterpriseLoginUrl } from "../../lib/platform-urls";

export function PlatformHowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 platform-product-story">
      <div className="platform-band platform-band--white">
        <div className="platform-band-inner">
          <p className="platform-band-kicker">How INTERTEXE works</p>
          <h2 className="platform-band-title">From raw product data to intelligent action.</h2>
          <p className="platform-band-copy">
            Create, verify, comply, distribute, and extend — one product record across the full lifecycle. Each stage
            has its own Discover path.
          </p>
          <div className="platform-product-story-lifecycle">
            <WhatItIsProcessVisual />
          </div>
        </div>
      </div>

      <div className="platform-band platform-band--dark" id="material-intelligence">
        <div className="platform-band-inner">
          <header className="platform-product-story-phase-head platform-product-story-phase-head--intel">
            <p className="platform-product-story-phase-kicker platform-band-kicker">Material intelligence</p>
            <p className="platform-product-story-flow-line">
              <span>Analyze</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>
                →
              </span>
              <span>Benchmark</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>
                →
              </span>
              <span>Forecast</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>
                →
              </span>
              <span>Recommend</span>
              <span className="platform-product-story-flow-arrow" aria-hidden>
                →
              </span>
              <span>Act</span>
            </p>
          </header>
          <p className="platform-band-copy">
            Brief, benchmark, forecast, and recommended actions live inside your INTERTEXE workspace — assembled from
            your governed catalog, not generic output.{" "}
            <Link href={getEnterpriseLoginUrl()}>Sign in to open intelligence</Link> or{" "}
            <Link href="/platform/demo">tour the live demo</Link>.
          </p>
          <div className="platform-intel-moment">
            <Image
              src="/fabrics/fabric-linen.jpg"
              alt=""
              fill
              className="platform-intel-moment-fabric"
              sizes="100vw"
            />
            <div className="platform-intel-moment-ui">
              <Image
                src="/platform/compare-benchmark.png"
                alt="INTERTEXE material benchmark in the product workspace"
                width={2400}
                height={1500}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="platform-band platform-band--white">
        <div className="platform-band-inner">
          <p className="platform-band-kicker">One workspace</p>
          <h2 className="platform-band-title">Three layers. One governed source of truth.</h2>
          <p className="platform-band-copy">
            INTERTEXE connects product creation, compliance, consumer transparency, and resale through the same record
            — grouped here as product intelligence, traceability, and connected lifecycle.
          </p>
          <div className="platform-stage">
            <Image
              src="/fabrics/fabric-wool.jpg"
              alt=""
              fill
              className="platform-stage-fabric"
              sizes="100vw"
            />
            <Image
              src="/platform/hero-workspace-desktop.png"
              alt="INTERTEXE product workspace — catalog, materials, and governed record"
              width={1600}
              height={1000}
              className="platform-stage-ui"
            />
          </div>
          <PlatformProductPillarsVisual variant="light" />
          <p className="mt-10 text-[17px] text-[var(--platform-muted)] leading-relaxed max-w-2xl">
            <Link href="/platform/demo" className="underline underline-offset-4 hover:text-[var(--platform-ink)]">
              See it live
            </Link>{" "}
            with sample products, or{" "}
            <Link
              href="/platform/request?intent=snapshot&cta=platform_breadth"
              className="underline underline-offset-4 hover:text-[var(--platform-ink)]"
            >
              start with 10 of your own products
            </Link>
            .
          </p>
          <PlatformCapabilityNav className="mt-10 sm:mt-12 lg:mt-14" />
        </div>
      </div>
    </section>
  );
}
