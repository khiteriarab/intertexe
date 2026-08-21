import { SERIF } from "../platform-ui";

export function DemoOfficeSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div>
          <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#8a847c] mb-5">
            Location
          </p>
          <h2
            className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] text-[#152238] mb-8"
            style={SERIF}
          >
            Our <em className="italic font-light">office</em>
          </h2>
          <div className="border-l-2 border-[#152238] pl-5">
            <p className="text-base font-medium text-[#152238] mb-1">Barcelona</p>
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-2">Platform office</p>
            <p className="text-sm text-[#5c5854] leading-relaxed">Barcelona, Spain</p>
          </div>
          <p className="text-sm text-[#8a847c] leading-relaxed mt-6 max-w-sm">
            The INTERTEXE platform team is based in Barcelona. Write to{" "}
            <a href="mailto:khiteri@intertexe.com" className="text-[#152238] underline underline-offset-4">
              khiteri@intertexe.com
            </a>{" "}
            or{" "}
            <a href="mailto:info@intertexe.com" className="text-[#152238] underline underline-offset-4">
              info@intertexe.com
            </a>
            . A street address is shared when we meet — it is not published here.
          </p>
        </div>
        <figure className="m-0 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/platform/barcelona-platform-office.jpg"
            alt="A street in Barcelona, Spain"
            width={1400}
            height={933}
            className="w-full h-auto aspect-[3/2] object-cover border border-[#e8e3da] bg-[#eeeae4]"
          />
          <figcaption className="mt-3 text-xs text-[#8a847c] leading-relaxed">
            Barcelona, Spain. City context for the platform office — not a photograph of INTERTEXE rooms or
            staff.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
