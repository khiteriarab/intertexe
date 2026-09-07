import Link from "next/link";
import { CONSUMER_PROOF_LINKS, DUAL_MODEL_FLYWHEEL } from "../../../lib/enterprise/dual-model";

export function EntDualModelFlywheel({ base }: { base: string }) {
  return (
    <section className="mb-10 md:mb-12">
      <div className="ent-dual-flywheel">
        <div className="relative z-[1]">
          <p className="ent-section-eyebrow text-white/50">The INTERTEXE model</p>
          <h2 className="ent-signal-hero-title">Fashion brand on top. Textile intelligence underneath.</h2>
          <p className="text-sm text-white/70 mt-3 max-w-2xl leading-relaxed">
            INTERTEXE is not a compliance checkbox vendor. The same catalog shoppers browse powers governed material
            signals brands act on — customer zero runs both sides on one ontology.
          </p>

          <ol className="ent-dual-flywheel-steps mt-8">
            {DUAL_MODEL_FLYWHEEL.map((step, index) => (
              <li key={step.id} className="ent-dual-flywheel-step">
                <span className="ent-dual-flywheel-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/45">{step.label}</p>
                  <p className="font-semibold text-white mt-1">{step.title}</p>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">{step.body}</p>
                  {step.href ? (
                    <a href={step.href} className="ent-link-subtle mt-2 inline-flex text-white/80">
                      Open consumer surface →
                    </a>
                  ) : step.surface === "enterprise" ? (
                    <Link href={`${base}/products`} className="ent-link-subtle mt-2 inline-flex text-white/80">
                      Open workspace →
                    </Link>
                  ) : (
                    <Link href={`${base}/benchmarking`} className="ent-link-subtle mt-2 inline-flex text-white/80">
                      View signals →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3 mt-8">
            {CONSUMER_PROOF_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="ent-benchmark-fiber-chip hover:bg-white/20 transition-colors"
                title={link.description}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
