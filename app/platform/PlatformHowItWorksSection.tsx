import Link from "next/link";
import ProductLifecycleSystem from "../../components/see-it-live/ProductLifecycleSystem";
import { PlatformProductPillarsVisual } from "./b2b-visuals/PlatformProductPillarsVisual";
import { Body, Eyebrow, Heading } from "./platform-ui";

export function PlatformHowItWorksSection() {
  return (
    <>
      <ProductLifecycleSystem />

      <section
        id="how-it-works"
        className="scroll-mt-28 platform-product-story platform-what-it-is platform-abstract-band py-16 sm:py-20 lg:py-28"
      >
        <div className="relative platform-lux-wrap">
          <div className="platform-workspace-merge">
            <div className="max-w-3xl mb-8 lg:mb-10">
              <Eyebrow className="mb-4">One workspace</Eyebrow>
              <Heading className="mb-4 max-w-3xl">Three layers. One governed source of truth.</Heading>
              <Body className="max-w-2xl lg:max-w-3xl">
                INTERTEXE connects product creation, compliance, consumer transparency, and resale through the same
                record — grouped here as product intelligence, traceability, and connected lifecycle.
              </Body>
            </div>

            <PlatformProductPillarsVisual variant="light" />

            <p className="mt-8 lg:mt-10 text-sm text-[var(--platform-quiet)] leading-relaxed max-w-2xl">
              <Link href="/brands/demo" className="underline underline-offset-4 hover:text-[var(--platform-primary)]">
                See it live
              </Link>{" "}
              with sample products, or{" "}
              <Link
                href="/brands/request?intent=snapshot&cta=platform_breadth"
                className="underline underline-offset-4 hover:text-[var(--platform-primary)]"
              >
                start with 10 of your own products
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
