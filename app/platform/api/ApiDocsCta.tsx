import Link from "next/link";
import { SERIF } from "../platform-ui";

export function ApiDocsCta() {
  return (
    <section id="api-access-cta" className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-16 sm:pb-20">
      <div className="api-docs-cta-banner">
        <img
          src="/platform/hero-product-window.png"
          alt=""
          width={800}
          height={600}
          className="api-docs-cta-image"
          aria-hidden
        />
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-4">
            For fashion intelligence teams
          </p>
          <h2 className="text-[1.75rem] sm:text-[2.25rem] font-light leading-[1.12] mb-4" style={SERIF}>
            Need API access?
          </h2>
          <p className="text-[15px] text-[var(--platform-muted)] font-light leading-relaxed mb-8 max-w-md">
            Production access, higher rate limits, and custom data partnerships — discuss what your catalog and workflow
            require.
          </p>
          <Link
            href="/platform/request?intent=api_access&cta=docs_footer"
            className="inline-flex w-fit items-center justify-center rounded-full text-[11px] tracking-[0.14em] uppercase bg-[var(--platform-primary)] text-white px-7 py-3.5 min-h-[44px] hover:opacity-90 transition-opacity"
          >
            Discuss API access
          </Link>
        </div>
      </div>
    </section>
  );
}
