import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { PrimaryLink, SecondaryLink, SERIF } from "../platform-ui";

export function DemoPilotCta() {
  return (
    <section id="pilot" className="scroll-mt-28 mb-12 sm:mb-16">
      <div className="demo-tour-pilot grid md:grid-cols-2 gap-0 items-stretch">
        <div className="relative min-h-[280px] md:min-h-[360px]">
          <img
            src={DEMO_FEATURED.image}
            alt=""
            width={800}
            height={1000}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161513]/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#ebe4da]/30" />
        </div>
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-4">Pilot workspace</p>
          <h2 className="text-[1.75rem] sm:text-[2.25rem] font-light leading-[1.12] mb-4" style={SERIF}>
            Your catalog, governed in INTERTEXE.
          </h2>
          <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-8 max-w-md">
            Send a catalog profile. We&apos;ll configure a 10-product pilot workspace so you can experience the full
            workflow with your own assortment.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryLink href="/brands/request?intent=snapshot&cta=demo_pilot">Start with 10 products</PrimaryLink>
            <SecondaryLink href="/brands/request?intent=saas&cta=demo_pilot">Talk to us</SecondaryLink>
          </div>
        </div>
      </div>
    </section>
  );
}
