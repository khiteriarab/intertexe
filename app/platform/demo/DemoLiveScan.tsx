import { DEMO_FEATURED } from "../../../lib/material-intelligence/demo-featured";
import { SERIF } from "../platform-ui";

const STEPS = ["Scan", "Resolve", "Experience"] as const;

export function DemoLiveScan() {
  return (
    <section id="live-scan" className="scroll-mt-28 mb-16 sm:mb-24">
      <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--platform-quiet)] mb-3">Live scan</p>
      <h2 className="text-[1.75rem] sm:text-3xl font-light mb-8 max-w-xl leading-[1.15]" style={SERIF}>
        From hangtag to governed experience.
      </h2>

      <div className="demo-tour-scan-flow">
        <figure className="m-0 relative">
          <div className="rounded-2xl overflow-hidden border border-[var(--platform-border)] bg-[#f0ebe4] aspect-[4/5] max-h-[420px]">
            <img
              src="/platform/surface-iphone-scanner.jpg"
              alt="Hand scanning INTERTEXE hangtag on garment"
              width={600}
              height={750}
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="mt-3 text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">
            Scan the tag
          </figcaption>
        </figure>

        <div className="demo-tour-scan-bridge" aria-hidden>
          {STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-1">
              {i > 0 ? <span className="demo-tour-scan-bridge-line" /> : null}
              <span className="text-[10px] tracking-[0.16em] uppercase text-[var(--platform-accent)]">{step}</span>
              {i < STEPS.length - 1 ? <span className="text-[var(--platform-quiet)]">→</span> : null}
            </div>
          ))}
        </div>

        <figure className="m-0">
          <div className="rounded-[2rem] border-[6px] border-[#161513] bg-[#161513] overflow-hidden max-w-[280px] mx-auto shadow-[0_32px_64px_rgba(22,21,19,0.14)]">
            <div className="bg-[#faf8f4] px-4 py-2 flex justify-center">
              <span className="h-1 w-16 rounded-full bg-[#ddd5cb]" />
            </div>
            <img
              src={DEMO_FEATURED.image}
              alt={`${DEMO_FEATURED.name} passport`}
              width={280}
              height={360}
              className="w-full aspect-[3/4] object-cover"
            />
            <div className="bg-white p-4">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-1">
                Digital Product Passport
              </p>
              <p className="text-base text-[var(--platform-ink)] mb-2" style={SERIF}>
                {DEMO_FEATURED.name}
              </p>
              <ul className="space-y-1.5 text-[11px] text-[var(--platform-muted)]">
                {["Composition", "Origin", "Care & repair", "Environmental impact", "Resale value"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-[var(--platform-accent)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <figcaption className="mt-3 text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] text-center">
            Passport opens on phone
          </figcaption>
        </figure>
      </div>

      <p className="mt-10 text-center text-[15px] text-[var(--platform-muted)] font-light max-w-xl mx-auto">
        The physical product resolves to the governed record powering the customer experience.
      </p>
    </section>
  );
}
