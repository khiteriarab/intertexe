import { CATALOG_STATS } from "../../lib/catalog-stats";
import { SERIF } from "./platform-ui";

/** Brands shoppers can already find in the INTERTEXE consumer catalog — not enterprise customers. */
export const CATALOG_MARQUEE_BRANDS = [
  "Totême",
  "Frame",
  "Vince",
  "Nanushka",
  "Sandro",
  "Theory",
  "COS",
  "Arket",
  "Reformation",
  "Ganni",
  "Isabel Marant",
  "Zimmermann",
  "Sézane",
  "The Row",
  "Eileen Fisher",
  "AGOLDE",
  "Lemaire",
  "Acne Studios",
] as const;

function BrandCard({ name }: { name: string }) {
  return (
    <div className="shrink-0 w-[168px] sm:w-[188px] h-[72px] sm:h-[80px] flex items-center justify-center rounded-sm bg-white/8 border border-white/15 px-4">
      <span className="text-[11px] sm:text-xs tracking-[0.16em] uppercase text-white text-center leading-tight">
        {name}
      </span>
    </div>
  );
}

export function CatalogMarquee() {
  const loop = [...CATALOG_MARQUEE_BRANDS, ...CATALOG_MARQUEE_BRANDS];

  return (
    <section className="bg-[#152238] text-white py-12 sm:py-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mb-8">
        <p className="text-[10px] tracking-[0.18em] uppercase text-white/55 mb-4">Consumer catalog</p>
        <h2 className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] mb-3" style={SERIF}>
          {CATALOG_STATS.productCountFormatted} pieces shoppers already search.
        </h2>
        <p className="text-sm text-white/75 max-w-2xl leading-relaxed">
          These boxes move through brands in the INTERTEXE consumer catalog — {CATALOG_STATS.brandCountFormatted}{" "}
          shoppable names. This is not a list of enterprise customers.
        </p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-[#152238] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-[#152238] to-transparent z-10" />
        <div className="overflow-hidden">
          <div className="itx-marquee-track flex w-max gap-3 pr-3">
            {loop.map((name, index) => (
              <BrandCard key={`${name}-${index}`} name={name} />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <ul className="space-y-2 text-sm text-white/90">
          <li className="flex items-start gap-2">
            <span aria-hidden="true">✓</span>
            <span>Live natural-fiber catalog — consumers shop by material today.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true">✓</span>
            <span>Observed brand demand from that catalog is coming / developing.</span>
          </li>
        </ul>
        <a
          href="/"
          className="inline-flex items-center justify-center text-[11px] tracking-[0.14em] uppercase border border-white/70 text-white px-7 py-3.5 hover:bg-white hover:text-[#152238] min-h-[44px]"
        >
          Explore the consumer catalog →
        </a>
      </div>
    </section>
  );
}
