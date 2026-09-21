import Link from "next/link";
import { SERIF } from "../platform-ui";

export function DemoHero() {
  return (
    <section id="hero" className="demo-editorial-hero scroll-mt-24">
      <div className="demo-editorial-hero-inner">
        <div className="demo-editorial-hero-layout">
          <div className="demo-editorial-hero-copy">
            <p className="demo-editorial-hero-eyebrow">Live demo</p>
            <h1 className="demo-editorial-hero-title" style={SERIF}>
              From a tag to full transparency.
            </h1>
            <p className="demo-editorial-hero-lede">
              See how INTERTEXE turns product data into a verified digital passport — and a richer customer experience.
            </p>
            <div className="demo-editorial-hero-actions">
              <Link href="#passport" className="demo-editorial-btn-primary">
                See a live product →
              </Link>
              <Link href="#journey" className="demo-editorial-btn-text">
                Or explore the catalog
              </Link>
            </div>
            <p className="demo-editorial-hero-foot">Real data / Real products / Real impact</p>
          </div>

          <figure className="demo-editorial-hero-art m-0">
            <img
              src="/platform/demo-hero-scanner-v2.png"
              alt="INTERTEXE scanner app turning a garment tag into a digital product passport — from tag to passport, cleaner product data, better customer experience, and real sales potential"
              width={1672}
              height={941}
              className="demo-editorial-hero-art-image"
              loading="eager"
              decoding="async"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
