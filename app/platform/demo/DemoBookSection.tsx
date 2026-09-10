import { Body, Eyebrow, PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";

export function DemoBookSection() {
  return (
    <section id="book" className="bg-white border-y border-[#e8e3da] py-12 sm:py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <Eyebrow>Book a conversation</Eyebrow>
        <h2
          className="text-[1.75rem] sm:text-3xl md:text-4xl font-light leading-[1.2] text-[#161513] mb-4"
          style={SERIF}
        >
          See INTERTEXE with your own products.
        </h2>
        <Body className="mb-6 max-w-xl mx-auto">
          Send a catalog profile — not the files. The INTERTEXE team replies from Barcelona with the next step
          for a 10-product Material Snapshot, the Founding Pilot, or platform access.
        </Body>
        <ul className="space-y-3 text-sm text-[#161513] mb-8 max-w-md mx-auto text-left">
          {[
            "Free 10-product Material Snapshot",
            "Founding Pilot — $5,000",
            "Platform from $499/month",
          ].map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="text-[#152238] mt-0.5 shrink-0" aria-hidden="true">
                →
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <PrimaryLink href="/platform/request?intent=snapshot&cta=demo_page">Request a demo</PrimaryLink>
          <SecondaryLink href="/platform/request?intent=founding_pilot&cta=demo_page">
            Founding Pilot
          </SecondaryLink>
        </div>
      </div>
    </section>
  );
}
