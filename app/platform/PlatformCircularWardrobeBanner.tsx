import Image from "next/image";
import Link from "next/link";
import { EDITORIAL_HERO } from "../../lib/editorial-assets";
import { SERIF } from "./platform-ui";

/** Fashion-led closing CTA — textile photography, not landscape sustainability imagery. */
export function PlatformCircularWardrobeBanner() {
  return (
    <section className="platform-circular-banner-section">
      <div className="platform-circular-banner platform-circular-banner--wide">
        <Image
          src={EDITORIAL_HERO.silk}
          alt=""
          fill
          className="platform-circular-banner-photo object-cover"
          sizes="100vw"
          priority={false}
        />
        <div className="platform-circular-banner-gradient" aria-hidden />
        <div className="platform-circular-banner-inner">
          <div className="platform-circular-banner-copy">
            <p className="platform-circular-banner-eyebrow">INTERTEXE platform</p>
            <p className="platform-circular-banner-title" style={SERIF}>
              Build the record your product deserves.
            </p>
            <p className="platform-circular-banner-sub">
              Bring your product data, compliance and consumer experience into one governed system.
            </p>
          </div>
          <Link href="/platform/request?intent=snapshot&cta=request_demo" className="platform-circular-banner-cta">
            Request a demo →
          </Link>
        </div>
      </div>
    </section>
  );
}
