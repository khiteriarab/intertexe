import { SERIF } from "../platform-ui";

const MODES = [
  {
    id: "hosted",
    label: "INTERTEXE Hosted",
    tier: "Platform",
    designer: "INTERTEXE templates",
    surface: "INTERTEXE-hosted passport",
    copy: "Choose Editorial, Trace, Essential, or Circular. Add logo, colors, and imagery. QR resolves to a beautiful passport we host — zero development.",
    example: "intertexe.com/p/ABC123",
  },
  {
    id: "whitelabel",
    label: "White Label",
    tier: "Professional · Enterprise",
    designer: "Brand selects & customizes INTERTEXE design",
    surface: "Your branded passport domain",
    copy: "Same templates and governed data — published on passport.yourbrand.com. Your customer never needs to know INTERTEXE hosts the infrastructure.",
    example: "passport.yourbrand.com/p/ABC123",
  },
  {
    id: "headless",
    label: "Headless API",
    tier: "Enterprise",
    designer: "Brand completely",
    surface: "Your app · website · service tools",
    copy: "Already have the Gucci or Nike app? Pull approved passport data via API and render it inside your existing digital ecosystem. INTERTEXE owns the data cloud — you own the presentation.",
    example: "GET /v1/products/ABC123/passport",
  },
] as const;

const STACK = [
  "Product identity · materials · origin · traceability",
  "Publication engine — approved fields only",
  "Delivery layer — Hosted · White Label · API",
  "Data carrier — QR · NFC · RFID",
  "Consumer — brand app · brand site · hosted passport",
] as const;

export function DeliveryModesVisual() {
  return (
    <figure className="m-0">
      <div className="itx-editorial-panel overflow-hidden shadow-[0_20px_50px_rgba(44,38,32,0.06)]">
        <div className="itx-editorial-panel-inner bg-white">
        <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[var(--platform-border)]">
          {MODES.map((mode) => (
            <article key={mode.id} className="p-6 sm:p-7 flex flex-col min-h-[280px]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-lg font-light text-[var(--platform-primary)]" style={SERIF}>
                  {mode.label}
                </h3>
                <span className="shrink-0 text-[9px] tracking-[0.12em] uppercase px-2 py-1 rounded-full bg-[var(--platform-highlight)] text-[var(--platform-muted)] border border-[var(--platform-border)]">
                  {mode.tier}
                </span>
              </div>
              <dl className="space-y-3 text-sm mb-4 flex-1">
                <div>
                  <dt className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] mb-1">
                    Who designs the experience
                  </dt>
                  <dd className="text-[var(--platform-muted)] leading-relaxed">{mode.designer}</dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-[0.12em] uppercase text-[var(--platform-quiet)] mb-1">
                    Where the consumer sees it
                  </dt>
                  <dd className="text-[var(--platform-muted)] leading-relaxed">{mode.surface}</dd>
                </div>
              </dl>
              <p className="text-xs text-[var(--platform-muted)] leading-relaxed mb-4">{mode.copy}</p>
              <p className="font-mono text-[10px] text-[var(--platform-primary)] bg-[var(--platform-highlight)] px-3 py-2 rounded-md border border-[var(--platform-border)]">
                {mode.example}
              </p>
            </article>
          ))}
        </div>
        <div className="platform-abstract-band itx-abstract-motif border-t border-[var(--platform-border)] px-6 sm:px-8 py-5">
          <p className="relative text-[10px] tracking-[0.18em] uppercase text-[var(--platform-accent)] mb-3">
            One governed record · three delivery modes · not mutually exclusive
          </p>
          <ol className="relative flex flex-wrap gap-x-6 gap-y-2">
            {STACK.map((layer, index) => (
              <li key={layer} className="text-xs text-[var(--platform-muted)] flex items-center gap-2">
                <span className="text-[var(--platform-accent)] tabular-nums">{index + 1}.</span>
                {layer}
              </li>
            ))}
          </ol>
        </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Large brands often use all three: QR on garment → white-label web passport · brand mobile app → same API ·
        customer service portal → same governed data. You are not licensing your data back — you pay INTERTEXE to govern,
        host, transform, maintain, and distribute it.
      </figcaption>
    </figure>
  );
}
