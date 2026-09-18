import { DeliveryModesVisual } from "./b2b-visuals/DeliveryModesVisual";
import { PlatformBrandShowcaseHero } from "./PlatformBrandShowcaseHero";
import { Body, Eyebrow, Heading } from "./platform-ui";

export function SalesHeroSection() {
  return <PlatformBrandShowcaseHero />;
}

export function SalesDeliverySection() {
  return (
    <section id="delivery" className="platform-abstract-band itx-abstract-motif py-16 sm:py-20 lg:py-24">
      <div className="relative platform-lux-wrap">
        <div className="mb-10 lg:mb-14 max-w-3xl">
          <Eyebrow>Consumer delivery</Eyebrow>
          <Heading className="mb-4">One record. Three ways to deliver.</Heading>
          <Body className="mb-0">
            Turn your governed material data into trusted consumer experiences — whether you host it on INTERTEXE,
            bring your own look and feel, or connect directly through our API. Smaller brands launch hosted passports
            with zero development. Enterprise brands run all three delivery modes from the same approved record.
          </Body>
        </div>
        <DeliveryModesVisual />
      </div>
    </section>
  );
}
