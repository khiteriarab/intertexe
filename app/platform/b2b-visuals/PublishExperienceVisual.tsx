import { SERIF } from "../platform-ui";

export function PublishExperienceVisual() {
  return (
    <figure className="m-0">
      <div className="itx-editorial-panel overflow-hidden">
        <div className="itx-editorial-panel-inner p-6 sm:p-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--platform-quiet)] mb-2">Publish product experience</p>
          <h3 className="text-xl sm:text-2xl font-light text-[var(--platform-primary)] mb-6" style={SERIF}>
            Scan the QR beside your desk. See what your customer sees.
          </h3>

          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 lg:gap-8">
            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--platform-border)] bg-white p-5">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-3">Data carrier</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    ["QR", true],
                    ["NFC", false],
                    ["RFID", false],
                  ].map(([label, active]) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border ${
                        active
                          ? "border-[var(--platform-accent)] bg-[var(--platform-accent-soft)]/40 text-[var(--platform-primary)]"
                          : "border-[var(--platform-border)] text-[var(--platform-muted)]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-[var(--platform-accent)]" : "bg-[var(--platform-border)]"}`}
                        aria-hidden
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--platform-border)] bg-white p-5">
                <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)] mb-3">
                  Consumer experience
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3 items-start">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[var(--platform-accent)] shrink-0" aria-hidden />
                    <div>
                      <p className="font-medium text-[var(--platform-primary)]">Hosted by INTERTEXE</p>
                      <p className="text-xs text-[var(--platform-muted)] mt-0.5">
                        Editorial · Trace · Essential · Circular
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start opacity-70">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[var(--platform-border)] shrink-0" aria-hidden />
                    <div>
                      <p className="font-medium text-[var(--platform-primary)]">White label domain</p>
                      <p className="text-xs text-[var(--platform-muted)] mt-0.5">passport.yourbrand.com</p>
                    </div>
                  </li>
                  <li className="flex gap-3 items-start opacity-70">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[var(--platform-border)] shrink-0" aria-hidden />
                    <div>
                      <p className="font-medium text-[var(--platform-primary)]">Headless API</p>
                      <p className="text-xs text-[var(--platform-muted)] mt-0.5">Active · brand app integration</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-4 text-xs">
                <span className="inline-flex items-center gap-2 text-[var(--platform-primary)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
                  Published
                </span>
                <span className="inline-flex items-center gap-2 text-[var(--platform-primary)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
                  Public API active
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--platform-border)] bg-white p-5 flex flex-col gap-4">
              <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Live preview</p>
              <div className="rounded-lg border border-[var(--platform-border)] overflow-hidden max-w-[220px] mx-auto">
                <div className="aspect-[9/16] bg-gradient-to-b from-[#e8e0d4] to-[#f5f0e8] relative">
                  <div
                    className="absolute inset-0 opacity-40"
                    aria-hidden
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 50% 30%, rgba(196,165,116,0.45) 0%, transparent 55%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#161513]/75 to-transparent">
                    <p className="text-[9px] tracking-[0.12em] uppercase text-white/60">Linen dress</p>
                    <p className="text-xs text-white font-light" style={SERIF}>
                      100% linen · Portugal
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center pt-2 border-t border-[var(--platform-border)]">
                <div className="inline-grid grid-cols-5 grid-rows-5 gap-0.5 p-2 border border-[var(--platform-border)] bg-[var(--platform-highlight)]">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <span
                      key={i}
                      className={`block w-2 h-2 ${i % 2 === 0 ? "bg-[var(--platform-primary)]" : "bg-[var(--platform-border)]"}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[var(--platform-muted)] mt-2 font-mono">Scan with iPhone → live passport</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-[var(--platform-quiet)] leading-relaxed">
        Illustrative publish screen from the enterprise workspace. The full-circle moment: configure, publish, scan, and
        verify — without leaving your desk.
      </figcaption>
    </figure>
  );
}
