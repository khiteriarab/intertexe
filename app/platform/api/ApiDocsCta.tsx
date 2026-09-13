import Link from "next/link";
import { SERIF } from "../platform-ui";

export function ApiDocsCta() {
  return (
    <section id="api-access-cta" className="api-editorial-cta scroll-mt-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-16 sm:pb-20">
        <div className="api-editorial-cta-banner">
          <div className="api-editorial-cta-copy">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">
              For fashion intelligence teams
            </p>
            <h2 className="text-[1.85rem] sm:text-[2.25rem] font-light leading-[1.12]" style={SERIF}>
              Need API access?
            </h2>
          </div>
          <p className="api-editorial-cta-body">
            Get in touch to discuss production access, higher rate limits or custom data partnerships.
          </p>
          <div className="api-editorial-cta-action">
            <Link href="/platform/request?intent=api_access&cta=docs_footer" className="api-editorial-btn-primary">
              Discuss API access →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
