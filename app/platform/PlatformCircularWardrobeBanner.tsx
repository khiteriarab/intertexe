import Image from "next/image";
import Link from "next/link";
import { EDITORIAL_BLOSSOM_BANNER } from "../../lib/editorial-assets";
import { SERIF } from "./platform-ui";

/** Editorial blossom banner — wide ivory fade + landscape, selective brand moment. */
export function PlatformCircularWardrobeBanner() {
  return (
    <section className="platform-circular-banner-section max-w-[1440px] mx-auto px-3 sm:px-5 md:px-6 lg:px-8 py-10 sm:py-14">
      <div className="platform-circular-banner platform-circular-banner--wide">
        <Image
          src={EDITORIAL_BLOSSOM_BANNER}
          alt=""
          fill
          className="platform-circular-banner-photo object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1440px"
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
