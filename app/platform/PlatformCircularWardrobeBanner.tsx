import Image from "next/image";
import Link from "next/link";
import { EDITORIAL_BLOSSOM_BANNER } from "../../lib/editorial-assets";
import { SERIF } from "./platform-ui";

/** Editorial blossom banner — wide ivory fade + landscape, selective brand moment. */
export function PlatformCircularWardrobeBanner() {
  return (
    <section className="platform-circular-banner-section py-10 sm:py-14">
      <div className="platform-circular-banner platform-circular-banner--wide">
        <Image
          src={EDITORIAL_BLOSSOM_BANNER}
          alt=""
          fill
          className="platform-circular-banner-photo object-cover"
          sizes="100vw"
          priority={false}
        />
        <div className="platform-circular-banner-gradient" aria-hidden />
        <div className="platform-circular-banner-inner">
          <div className="platform-circular-banner-copy">
            <p className="platform-circular-banner-eyebrow">A more circular wardrobe</p>
            <p className="platform-circular-banner-title" style={SERIF}>
              Greater transparency for a brighter tomorrow.
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
