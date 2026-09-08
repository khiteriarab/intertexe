import { SERIF } from "../platform-ui";
import { PlatformLeadForm } from "../PlatformLeadForm";

export function DemoOfficeSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
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
          <div className="border-l-2 border-[#152238] pl-5 mb-8">
            <p className="text-base font-medium text-[#152238] mb-1">Barcelona</p>
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#9c7b8b] mb-2">Platform office</p>
            <p className="text-sm text-[#5c5854] leading-relaxed">Barcelona, Spain</p>
          </div>
          <p className="text-sm text-[#8a847c] leading-relaxed max-w-sm">
            The INTERTEXE platform team is based in Barcelona. Send a note below and we&apos;ll reply from our
            platform inbox.
          </p>
        </div>
        <div className="min-w-0 grid gap-8">
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
          <div className="border border-[#e8e3da] bg-[#f7f5f1] p-5 sm:p-8">
            <PlatformLeadForm intent="snapshot" sourceCta="office_section" variant="office" />
          </div>
        </div>
      </div>
    </section>
  );
}
