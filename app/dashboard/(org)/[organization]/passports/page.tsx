import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { loadOrgPassports } from "../../../../../lib/enterprise/queries";
import { formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import {
  EntEmptyState,
  EntPageHeader,
  EntPassportPill,
  entLinkClass,
} from "../../../components/EnterpriseUi";
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
    <div>
      <EntPageHeader
        brandLine
        title="Passports"
        description="Digital product identities for your catalog. Published versions are immutable — QR codes keep the same public identity across updates."
      />

      {readyUnpublished.length > 0 ? (
        <section className="mb-12 md:mb-16">
          <h2 className="text-[11px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-5">
            Ready to publish
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            {readyUnpublished.map((product) => (
              <li
                key={product.id}
                className="rounded-[var(--ent-radius-xl)] p-5 md:p-6 bg-[var(--ent-gradient-blush)] border border-[var(--ent-border)] hover:shadow-[var(--ent-shadow-sm)] transition-shadow"
              >
                <Link href={`${base}/products/${product.id}`} className="block group">
                  <p className="text-[17px] font-medium text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors">
                    {product.name}
                  </p>
                  {product.sku ? <p className="text-xs text-[var(--ent-muted-light)] mt-1">SKU {product.sku}</p> : null}
                  <div className="mt-4 flex items-center justify-between">
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
          <h2 className="text-[11px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)] mb-5">
            Published identities
          </h2>
          <ul className="grid lg:grid-cols-2 gap-5 md:gap-6">
            {passports.map((passport) => {
              const absoluteUrl = passport.publicUrl.startsWith("http")
                ? passport.publicUrl
                : `${origin}${passport.publicUrl}`;
              const showQr = passport.state === "published" || passport.state === "update_required";
              const isPublished = passport.state === "published";

              return (
                <li
                  key={passport.id}
                  className={`rounded-[var(--ent-radius-xl)] overflow-hidden transition-shadow hover:shadow-[var(--ent-shadow)] ${
                    isPublished
                      ? "bg-[var(--ent-surface)] shadow-[var(--ent-shadow-sm)] ring-1 ring-[var(--ent-border)]"
                      : "bg-[var(--ent-surface)] shadow-[var(--ent-shadow-sm)]"
                  }`}
                >
                  <div
                    className={`px-5 py-4 md:px-6 ${isPublished ? "bg-[var(--ent-petrol-deep)] text-white" : "bg-[var(--ent-surface-muted)]/80"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-[11px] tracking-[0.12em] uppercase ${isPublished ? "text-white/50" : "text-[var(--ent-muted-light)]"}`}>
                          Digital passport
                        </p>
                        <h3 className={`text-[18px] font-medium mt-1 truncate ${isPublished ? "text-white" : "text-[var(--ent-ink)]"}`}>
                          {passport.productName || "Product"}
                        </h3>
                        {passport.productSku ? (
                          <p className={`text-xs mt-1 ${isPublished ? "text-white/55" : "text-[var(--ent-muted-light)]"}`}>
                            {passport.productSku}
                          </p>
                        ) : null}
                      </div>
                      <EntPassportPill state={passport.state} />
                    </div>
                  </div>

                  <div className="p-5 md:p-6 space-y-4">
                    {passport.currentVersion ? (
                      <p className="text-xs text-[var(--ent-muted-light)]">
                        Version {passport.currentVersion}
                        {passport.versions[0]?.published_at
                          ? ` · Updated ${new Date(passport.versions[0].published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                          : ""}
                      </p>
                    ) : null}

                    {passport.state === "update_required" ? (
                      <p className="text-sm text-[var(--ent-muted)]">
                        Last published snapshot is still live — a new version is needed.
                      </p>
                    ) : null}

                    {showQr ? (
                      <PassportQr url={absoluteUrl} publicId={passport.public_id} variant="collapsible" />
                    ) : (
                      <p className="font-mono text-xs text-[var(--ent-muted-light)] break-all">{passport.public_id}</p>
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
    </div>
  );
}
