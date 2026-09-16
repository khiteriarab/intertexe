import { DeliveryModesVisual } from "./b2b-visuals/DeliveryModesVisual";
import { PlatformBrandShowcaseHero } from "./PlatformBrandShowcaseHero";
import { Body, Eyebrow, Heading } from "./platform-ui";

export function SalesHeroSection() {
  return <PlatformBrandShowcaseHero />;
}

export function SalesDeliverySection() {
  return (
    <section className="platform-abstract-band itx-abstract-motif py-12 sm:py-16 lg:py-20">
      <div className="relative max-w-6xl lg:max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-10 mb-10 lg:mb-14 items-start">
          <div className="max-w-3xl">
            <Eyebrow>Consumer delivery</Eyebrow>
            <Heading className="mb-4">One record. Three ways to deliver.</Heading>
            <Body className="mb-0">
              Turn your governed material data into trusted consumer experiences — whether you host it on INTERTEXE,
              bring your own look and feel, or connect directly through our API. Smaller brands launch hosted passports
              with zero development. Enterprise brands run all three delivery modes from the same approved record.
            </Body>
          </div>
          <p className="hidden lg:block text-[10px] tracking-[0.18em] uppercase text-[var(--platform-accent)] border-l border-[var(--platform-accent)]/40 pl-4 max-w-[9rem] leading-relaxed">
            Same data · more possibilities
          </p>
        </div>
        <DeliveryModesVisual />
      </div>
    </section>
  );
}
