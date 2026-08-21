import { Body, Eyebrow, Heading, PrimaryLink } from "./platform-ui";

const STAGES = [
  {
    id: "brand",
    label: "Your brand",
    copy: "Use INTERTEXE intelligence across your own website, app and product pages.",
    image: "/platform/ecosystem-brand-channels.jpg",
    alt: "Sample brand website and app for Dress 8721, with composition and a View Product Passport link. Illustrative — not a live customer.",
    caption: "Your website + app. Powered by structured material intelligence.",
  },
  {
    id: "intelligence",
    label: "INTERTEXE intelligence",
    copy: "One structured product + material record powering normalization, data quality, benchmarking and DPP-ready outputs.",
    image: "/platform/ecosystem-intelligence.jpg",
    alt: "INTERTEXE workspace product record for Dress 8721. Illustrative sample workspace, not a live customer catalog.",
    caption: "Normalizes, enriches and connects every product + material record.",
  },
  {
    id: "consumer",
    label: "INTERTEXE consumer",
    copy: "Connect the same material intelligence to the INTERTEXE iPhone app and Chrome extension for material-first discovery.",
    image: "/platform/ecosystem-consumer.jpg",
    alt: "INTERTEXE iPhone app and Chrome extension showing Dress 8721. Illustrative consumer surfaces, not a retailer partnership.",
    caption: "Our app + Chrome extension. Material-first discovery while consumers shop.",
  },
] as const;

export function EcosystemStage() {
  return (
    <section className="bg-[#f7f5f1] border-y border-[#e8e3da] py-10 sm:py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <Eyebrow>From material intelligence to customer experience</Eyebrow>
        <Heading className="mb-4 max-w-3xl">Your product intelligence, wherever your customers shop.</Heading>
        <Body className="max-w-3xl mb-5">
          INTERTEXE turns product and material data into structured intelligence that can power your own website, app
          and Digital Product Passports — while the same material records connect into the INTERTEXE consumer shopping
          ecosystem.
        </Body>
        <p className="text-[15px] sm:text-base text-[#152238] mb-12 sm:mb-16 max-w-3xl">
          One intelligence layer. Your brand experience. Our consumer ecosystem.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.32fr)_minmax(0,1fr)] gap-10 lg:gap-8 items-start">
          <StageColumn stage={STAGES[0]} />
          <StageColumn stage={STAGES[1]} />
          <StageColumn stage={STAGES[2]} className="md:col-span-2 lg:col-span-1" />
        </div>

        <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_minmax(0,1.32fr)_minmax(0,1fr)] gap-8 mt-4 text-[11px] text-[#8a847c]">
          <p className="flex items-center justify-end gap-2 pr-2">
            Excel, CSV, PLM, PIM, supplier files <span aria-hidden="true">→</span>
          </p>
          <p className="flex items-center justify-end gap-2 pr-2">
            Same material record <span aria-hidden="true">→</span>
          </p>
          <p>Consumer catalog, iPhone app, Chrome extension</p>
        </div>

        <p className="mt-12 sm:mt-16 text-[15px] text-[#5c5854] font-light leading-relaxed max-w-3xl mb-8">
          Your brand keeps the customer relationship. INTERTEXE supplies the material intelligence underneath it —
          across your digital channels, passports and the INTERTEXE shopping ecosystem.
        </p>
        <PrimaryLink href="/platform/discover">See how the ecosystem connects →</PrimaryLink>
        <p className="mt-6 text-xs text-[#8a847c] leading-relaxed max-w-3xl">
          Illustrative sample — Dress 8721 is not a live customer catalog. Consumers do not need the INTERTEXE app to
          open a passport. Observed shopper demand in brand workspaces is coming / developing.
        </p>
      </div>
    </section>
  );
}

function StageColumn({
  stage,
  className = "",
}: {
  stage: (typeof STAGES)[number];
  className?: string;
}) {
  return (
    <figure className={`m-0 ${className}`}>
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#152238] mb-2">{stage.label}</p>
      <p className="text-sm text-[#5c5854] leading-relaxed mb-5">{stage.copy}</p>
      <div className="overflow-hidden border border-[#e8e3da] bg-white">
        <img
          src={stage.image}
          alt={stage.alt}
          width={1400}
          height={1050}
          className="block w-full h-auto object-cover aspect-[4/3]"
        />
      </div>
      <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">{stage.caption}</figcaption>
    </figure>
  );
}
