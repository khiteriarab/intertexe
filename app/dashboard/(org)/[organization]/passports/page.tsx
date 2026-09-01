import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgPassports } from "../../../../../lib/enterprise/queries";
import { formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import {
  EntEmptyState,
  EntPassportPill,
  entLinkClass,
} from "../../../components/EnterpriseUi";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { PassportQr } from "./PassportQr";

export const dynamic = "force-dynamic";

export default async function PassportsPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const { membership, client } = await requireOrganizationAccess(organization);
  const { passports, readyUnpublished } = await loadOrgPassports(client, membership.organizationId);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.intertexe.com").replace(/\/$/, "");
  const base = `/dashboard/${membership.slug}`;

  return (
    <EntModulePage
      zone="cream"
      title="Passports"
      description="Digital product identities for your catalog. Published versions are immutable — QR codes keep the same public identity across updates."
    >
      {readyUnpublished.length > 0 ? (
        <section className="mb-12 md:mb-14">
          <h2 className="ent-heading text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)] mb-6">Ready to publish</h2>
          <ul className="grid sm:grid-cols-2 gap-5">
            {readyUnpublished.map((product) => (
              <li
                key={product.id}
                className="relative overflow-hidden rounded-[var(--ent-radius-2xl)] p-6 md:p-7 shadow-[var(--ent-shadow-panel)] transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--ent-gradient-butter)" }}
              >
                <div
                  className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 pointer-events-none"
                  style={{ background: "radial-gradient(circle, var(--ent-petrol-glow), transparent 70%)" }}
                  aria-hidden
                />
                <Link href={`${base}/products/${product.id}`} className="block group relative">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-[var(--ent-muted-light)]">Awaiting publish</p>
                  <p className="ent-heading text-[1.5rem] mt-2 text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors">
                    {product.name}
                  </p>
                  {product.sku ? <p className="text-xs text-[var(--ent-muted-light)] mt-1">SKU {product.sku}</p> : null}
                  <div className="mt-6 flex items-center justify-between">
                    <EntPassportPill state="ready" />
                    <span className={`${entLinkClass} text-[13px]`}>Review →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {passports.length === 0 ? (
        <EntEmptyState
          title="No passports yet"
          body="Finish product review — identity, composition, origin, no blocking issues — then approve fields and publish."
          ctaHref={`${base}/products`}
          ctaLabel="Review products"
        />
      ) : (
        <section>
          <h2 className="ent-heading text-[1.75rem] md:text-[2rem] text-[var(--ent-ink)] mb-6">Published identities</h2>
          <ul className="grid lg:grid-cols-2 gap-6">
            {passports.map((passport) => {
              const absoluteUrl = passport.publicUrl.startsWith("http")
                ? passport.publicUrl
                : `${origin}${passport.publicUrl}`;
              const showQr = passport.state === "published" || passport.state === "update_required";
              const isPublished = passport.state === "published";

              return (
                <li
                  key={passport.id}
                  className="rounded-[var(--ent-radius-2xl)] overflow-hidden shadow-[var(--ent-shadow-lg)] transition-transform hover:-translate-y-0.5"
                >
                  <div
                    className="px-6 py-6 md:px-8 md:py-7 relative"
                    style={{
                      background: isPublished
                        ? "var(--ent-gradient-hero)"
                        : "var(--ent-gradient-stone)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-40 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 55%)",
                      }}
                      aria-hidden
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className={`text-[10px] tracking-[0.14em] uppercase ${isPublished ? "text-white/45" : "text-[var(--ent-muted-light)]"}`}>
                          Digital passport
                        </p>
                        <h3 className={`ent-heading text-[1.65rem] md:text-[1.85rem] mt-2 leading-tight truncate ${isPublished ? "text-white" : "text-[var(--ent-ink)]"}`}>
                          {passport.productName || "Product"}
                        </h3>
                        {passport.productSku ? (
                          <p className={`text-xs mt-2 ${isPublished ? "text-white/55" : "text-[var(--ent-muted-light)]"}`}>
                            {passport.productSku}
                          </p>
                        ) : null}
                      </div>
                      <EntPassportPill state={passport.state} />
                    </div>
                  </div>

                  <div className="bg-[var(--ent-surface)] p-6 md:p-7 space-y-5">
                    {passport.currentVersion ? (
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs uppercase tracking-wide text-[var(--ent-muted-light)]">
                          Version {passport.currentVersion}
                        </p>
                        {passport.versions[0]?.published_at ? (
                          <p className="text-xs text-[var(--ent-muted-light)]">
                            {new Date(passport.versions[0].published_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {passport.state === "update_required" ? (
                      <p className="text-sm text-[var(--ent-muted)]">
                        Last published snapshot is still live — a new version is needed.
                      </p>
                    ) : null}

                    {showQr ? (
                      <PassportQr url={absoluteUrl} publicId={passport.public_id} variant="collapsible" />
                    ) : (
                      <p className="font-mono text-xs text-[var(--ent-muted-light)] break-all bg-[var(--ent-surface-muted)] rounded-xl px-4 py-3">
                        {passport.public_id}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                      {passport.product_id ? (
                        <Link className={entLinkClass} href={`${base}/products/${passport.product_id}`}>
                          Open product →
                        </Link>
                      ) : null}
                      {showQr ? (
                        <Link className={entLinkClass} href={`/p/${passport.public_id}`}>
                          View public passport →
                        </Link>
                      ) : null}
                    </div>

                    {passport.versions.length > 1 ? (
                      <div className="pt-4 border-t border-[var(--ent-border)]">
                        <p className="text-[10px] tracking-[0.1em] uppercase text-[var(--ent-muted-light)] mb-2">
                          Version history
                        </p>
                        <ul className="text-xs text-[var(--ent-muted)] space-y-1">
                          {passport.versions.slice(0, 3).map((version) => (
                            <li key={version.id}>
                              v{version.version_number} · {formatReviewerLine(version.actor, version.published_at)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </EntModulePage>
  );
}
