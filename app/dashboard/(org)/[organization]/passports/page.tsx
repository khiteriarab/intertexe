import Link from "next/link";
import { requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import { loadOrgPassports } from "../../../../../lib/enterprise/queries";
import { formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import { HqPageHeader } from "../../../components/HqUi";
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

  return (
    <div>
      <HqPageHeader
        title="Passports"
        description="Ready products can publish. Ineligible products explain what is missing. A published version cannot be silently overwritten; QR codes keep the same public identity."
      />
      <p className="text-sm text-black/60 mb-4">
        {passports.length === 0 && readyUnpublished.length === 0
          ? "No passports yet. Finish product review — identity, composition, origin, no blocking issues, then approve fields."
          : "Publish from the product page. After a later source update, the passport shows Update required until you publish a new version."}
      </p>

      {readyUnpublished.length ? (
        <div className="bg-white border border-black/10 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium">Ready to publish</h2>
          <ul className="text-sm mt-2 space-y-1">
            {readyUnpublished.map((product) => (
              <li key={product.id}>
                <Link className="underline" href={`/dashboard/${membership.slug}/products/${product.id}`}>
                  {product.name}
                </Link>
                {product.sku ? ` · ${product.sku}` : ""} — open the product to preview and publish.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        {passports.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-xl p-6 text-sm text-black/55">
            Nothing published yet. Eligible products appear above once review is complete.
          </div>
        ) : (
          passports.map((passport) => {
            const absoluteUrl = passport.publicUrl.startsWith("http")
              ? passport.publicUrl
              : `${origin}${passport.publicUrl}`;
            const showQr =
              passport.state === "published" || passport.state === "update_required";
            return (
              <article key={passport.id} className="bg-white border border-black/10 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-medium">
                      {passport.productName || "Product"}
                      {passport.productSku ? ` · ${passport.productSku}` : ""}
                    </h2>
                    <p className="text-sm text-black/60 mt-1">
                      {passportStateLabel(passport.state)}
                      {passport.currentVersion ? ` · v${passport.currentVersion}` : ""}
                      {passport.state === "update_required"
                        ? " — last published snapshot is still live; a new version is needed."
                        : ""}
                    </p>
                  </div>
                  {passport.product_id ? (
                    <Link
                      className="text-xs uppercase tracking-wide underline"
                      href={`/dashboard/${membership.slug}/products/${passport.product_id}`}
                    >
                      Open product
                    </Link>
                  ) : null}
                </div>
                {showQr ? <PassportQr url={absoluteUrl} publicId={passport.public_id} /> : (
                  <p className="font-mono text-xs break-all text-black/50">{passport.public_id}</p>
                )}
                {showQr ? (
                  <Link className="inline-block text-xs uppercase tracking-wide underline" href={`/p/${passport.public_id}`}>
                    Open public passport
                  </Link>
                ) : null}
                {passport.versions.length ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-black/45">Versions (immutable once published)</p>
                    <ul className="text-sm mt-1 space-y-1">
                      {passport.versions.map((version) => (
                        <li key={version.id}>
                          v{version.version_number} · {version.change_summary || version.state} ·{" "}
                          {formatReviewerLine(version.actor, version.published_at)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
