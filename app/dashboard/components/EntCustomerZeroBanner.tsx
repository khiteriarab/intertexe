import Link from "next/link";
import { CONSUMER_PROOF_LINKS } from "../../../lib/enterprise/dual-model";

export function EntCustomerZeroBanner({ base }: { base: string }) {
  return (
    <section className="mb-8 md:mb-10">
      <div className="ent-customer-zero-banner">
        <div className="relative z-[1] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="ent-section-eyebrow text-[var(--ent-petrol-deep)] mb-2">Customer zero</p>
            <h2 className="ent-widget-title">This workspace runs on INTERTEXE&apos;s own catalog</h2>
            <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">
              You are viewing the same material intelligence INTERTEXE sells to brands — live products from the consumer
              market graph, not a demo sandbox. What works here is what we prove to partners.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 shrink-0">
            {CONSUMER_PROOF_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="ent-customer-zero-link"
                title={link.description}
              >
                {link.label} →
              </a>
            ))}
            <Link href={`${base}/benchmarking`} className="ent-customer-zero-link ent-customer-zero-link-primary">
              Consumer signals →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
