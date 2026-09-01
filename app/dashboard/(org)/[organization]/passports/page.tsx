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
      title="Passports"
      meta={
        <>
          <span>
            <strong>{passports.length}</strong> published identities
          </span>
          <span>
            <strong>{readyUnpublished.length}</strong> ready to publish
          </span>
        </>
      }
    >
      {readyUnpublished.length > 0 ? (
        <section className="mb-12">
          <h2 className="ent-serif text-[1.5rem] text-[var(--ent-ink)] mb-5">Ready to publish</h2>
          <ul className="space-y-4">
            {readyUnpublished.map((product) => (
              <li key={product.id} className="ent-passport-object">
                <Link href={`${base}/products/${product.id}`} className="block p-6 md:p-7 group">
                  <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)]">Awaiting publish</p>
                  <p className="ent-serif text-[1.65rem] mt-2 text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors">
                    {product.name}
                  </p>
                  {product.sku ? <p className="text-xs text-[var(--ent-muted-light)] mt-2">SKU {product.sku}</p> : null}
                  <div className="mt-5 flex items-center justify-between gap-4">
                    <EntPassportPill state="ready" />
                    <span className={entLinkClass}>Review →</span>
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
          <h2 className="ent-serif text-[1.5rem] text-[var(--ent-ink)] mb-5">Published identities</h2>
          <ul className="grid lg:grid-cols-2 gap-5">
            {passports.map((passport) => {
              const absoluteUrl = passport.publicUrl.startsWith("http")
                ? passport.publicUrl
                : `${origin}${passport.publicUrl}`;
              const showQr = passport.state === "published" || passport.state === "update_required";
              const updatedAt = passport.versions[0]?.published_at || passport.versions[0]?.created_at;

              return (
                <li key={passport.id} className="ent-passport-object">
                  <div
                    className="px-6 py-7 md:px-8 md:py-8"
                    style={{ background: passport.state === "published" ? "var(--ent-gradient-hero)" : "var(--ent-gradient-stone)" }}
                  >
                    <p className={`text-[10px] tracking-[0.14em] uppercase ${passport.state === "published" ? "text-white/45" : "text-[var(--ent-muted-light)]"}`}>
                      Digital passport
                    </p>
                    <h3 className={`ent-serif text-[1.85rem] md:text-[2rem] mt-2 leading-tight ${passport.state === "published" ? "text-white" : "text-[var(--ent-ink)]"}`}>
                      {passport.productName || "Product"}
                    </h3>
                    {passport.productSku ? (
                      <p className={`text-xs mt-2 ${passport.state === "published" ? "text-white/55" : "text-[var(--ent-muted-light)]"}`}>
                        {passport.productSku}
                      </p>
                    ) : null}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <EntPassportPill state={passport.state} />
                      {passport.currentVersion ? (
                        <p className={`text-xs uppercase tracking-wide ${passport.state === "published" ? "text-white/50" : "text-[var(--ent-muted-light)]"}`}>
                          Version {passport.currentVersion}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-6 py-5 md:px-8 md:py-6 bg-white border-t border-[var(--ent-border)] space-y-4">
                    {updatedAt ? (
                      <p className="text-xs text-[var(--ent-muted-light)]">
                        Updated{" "}
                        {new Date(updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}

                    {showQr ? (
                      <PassportQr url={absoluteUrl} publicId={passport.public_id} variant="collapsible" />
                    ) : (
                      <p className="font-mono text-xs text-[var(--ent-muted-light)] break-all">{passport.public_id}</p>
                    )}

                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {passport.product_id ? (
                        <Link className={entLinkClass} href={`${base}/products/${passport.product_id}`}>
                          Open product →
                        </Link>
                      ) : null}
                      {showQr ? (
                        <Link className={entLinkClass} href={`/p/${passport.public_id}`}>
                          View passport →
                        </Link>
                      ) : null}
                    </div>

                    {passport.versions.length > 1 ? (
                      <div className="pt-3 border-t border-[var(--ent-border)]">
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
