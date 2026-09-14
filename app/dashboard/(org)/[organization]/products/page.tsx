import Link from "next/link";
import { canMutateEnterprise, requireOrganizationAccess } from "../../../../../lib/enterprise/access";
import { formatCompositionDisplay, formatCompositionLines } from "../../../../../lib/enterprise/display-format";
import { passportStateLabel } from "../../../../../lib/enterprise/issue-copy";
import {
  pilotImageMaps,
  resolvePilotProductImage,
} from "../../../../../lib/enterprise/consumer-signals";
import { CATALOG_SORT_LABELS, CATALOG_SORTS } from "../../../../../lib/enterprise/catalog-sort";
import { loadOrgOverview, loadOrgProducts } from "../../../../../lib/enterprise/queries";
import livePilotProducts from "../../../../../lib/enterprise/fixtures/intertexe-live-10-products.json";
import {
  EntEmptyState,
  EntPassportPill,
  EntProductPlaceholder,
  entButtonGhostClass,
  entInputClass,
  entLinkClass,
  entMetaClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";
import { EntModulePage } from "../../../components/EnterpriseModuleUi";
import { ProductsBulkBar } from "./ProductsBulkBar";
import { ProductsImportDrawer } from "./ProductsImportDrawer";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organization: string }>;
  searchParams?: Promise<{ q?: string; state?: string; sort?: string; page?: string; imported?: string; issues?: string; collisions?: string; import?: string; focus?: string; origin?: string; category?: string }>;
}) {
  const { organization } = await params;
  const query = (await searchParams) || {};
  const q = query.q || "";
  const passportState = query.state || "";
  const sort = query.sort || "priority";
  const page = Number(query.page || "1") || 1;
  const imported = query.imported ? Number(query.imported) : null;
  const importedIssues = query.issues ? Number(query.issues) : 0;
  const importedCollisions = query.collisions ? Number(query.collisions) : 0;
  const autoOpenImport = query.import === "1";
  const focus = query.focus || "";
  const origin = query.origin || "";
  const category = query.category || "";
  const { membership, client } = await requireOrganizationAccess(organization);
  const [catalog, overview] = await Promise.all([
    loadOrgProducts(client, membership.organizationId, { q, passportState, sort, page, pageSize: 50, focus: focus || undefined, origin: origin || undefined, category: category || undefined }),
    loadOrgOverview(client, membership.organizationId),
  ]);
  const base = `/dashboard/${membership.slug}/products`;
  const canMutate = canMutateEnterprise(membership.role);
  function catalogHref(nextPage?: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (passportState) params.set("state", passportState);
    if (sort && sort !== "priority") params.set("sort", sort);
    if (focus) params.set("focus", focus);
    if (origin) params.set("origin", origin);
    if (category) params.set("category", category);
    if (nextPage && nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize));
  const pilotImages = pilotImageMaps(livePilotProducts);

  return (
    <EntModulePage
      title="Products"
      meta={
        <>
          <span>
            <strong>{overview.productCount}</strong> products
          </span>
          <span>
            <strong>{overview.publishedCount || overview.passportCounts.published || 0}</strong> published
          </span>
          <span>
            <strong>{overview.readyCount}</strong> ready
          </span>
        </>
      }
      action={<ProductsImportDrawer slug={membership.slug} canMutate={canMutate} autoOpen={autoOpenImport} />}
    >
      {focus || origin || category ? (
        <div className="mb-6 px-4 py-3 rounded-[var(--ent-radius-lg)] bg-[var(--ent-cream)] text-sm text-[var(--ent-muted)] border border-[var(--ent-border)] flex flex-wrap items-center justify-between gap-3">
          <span>
            Filtered from{" "}
            <Link href={`${base.replace("/products", "/traceability")}`} className={entLinkClass}>
              Traceability
            </Link>
            {focus ? `: missing ${focus.replaceAll("_", " ")}` : ""}
            {origin ? `: origin ${origin}` : ""}
            {category ? `: ${category}` : ""}
          </span>
          <Link href={base} className={entLinkClass}>
            Clear filters
          </Link>
        </div>
      ) : null}

      {imported != null && !Number.isNaN(imported) ? (
        <div className="mb-6 px-4 py-3 rounded-[var(--ent-radius-lg)] bg-[var(--ent-butter-soft)] text-sm text-[var(--ent-muted)] border border-[var(--ent-border)]">
          Imported {imported} products · {importedIssues} issues opened
          {importedCollisions ? ` · ${importedCollisions} identifier collisions kept separate` : ""}. Next: resolve
          blocking issues, then review and publish.
        </div>
      ) : null}

      <form className="flex flex-wrap items-center gap-2.5 mb-6" method="get">
        {focus ? <input type="hidden" name="focus" value={focus} /> : null}
        {origin ? <input type="hidden" name="origin" value={origin} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className={`${entInputClass} min-w-[12rem] flex-1 md:flex-none md:min-w-[20rem] !rounded-full !py-2.5`}
        />
        <select name="state" defaultValue={passportState} className={`${entSelectClass} min-w-[11rem] !rounded-full !py-2.5`}>
          <option value="">All passport states</option>
          {["incomplete", "review_required", "ready", "published", "update_required"].map((state) => (
            <option key={state} value={state}>
              {passportStateLabel(state)}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={`${entSelectClass} min-w-[11rem] !rounded-full !py-2.5`}>
          {CATALOG_SORTS.map((key) => (
            <option key={key} value={key}>
              {CATALOG_SORT_LABELS[key]}
            </option>
          ))}
        </select>
        <button type="submit" className={entButtonGhostClass}>
          Filter
        </button>
      </form>

      {catalog.rows.length === 0 ? (
        <EntEmptyState
          title={q || passportState ? "No matches" : "No products yet"}
          body={
            q || passportState
              ? "Try a different search or filter."
              : "Import your catalog to begin. INTERTEXE maps columns, previews identifier matches, then saves immutable source records."
          }
          ctaHref={q || passportState ? base : `${base}?import=1`}
          ctaLabel={q || passportState ? "Clear filters" : "Import products"}
        />
      ) : (
        <>
          <ProductsBulkBar
            slug={membership.slug}
            canMutate={canMutate}
            products={catalog.rows.map((product) => ({
              id: product.id,
              name: product.name,
              passport_state: product.passport_state,
              openIssueCount: product.openIssueCount,
              blockingIssueCount: product.blockingIssueCount,
            }))}
          />
          <ul className="ent-catalog-grid">
          {catalog.rows.map((product) => {
            const compositionLines = formatCompositionLines(product.composition);
            const compositionDisplay = formatCompositionDisplay(product.composition);
            return (
              <li key={product.id}>
                <Link href={`${base}/${product.id}`} className="ent-catalog-card group h-full">
                  <EntProductPlaceholder
                    category={product.category}
                    imageUrl={resolvePilotProductImage(product.sku, product.style_code, pilotImages)}
                    alt={product.name}
                  />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <p className="ent-title text-[1.05rem] text-[var(--ent-ink)] group-hover:text-[var(--ent-petrol-deep)] transition-colors line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-[13px] text-[var(--ent-muted)] mt-1 line-clamp-2">
                      {compositionLines.length > 0 ? compositionDisplay : "Composition not recorded"}
                    </p>
                    <p className={`${entMetaClass} mt-auto pt-3`}>
                      {[product.sku, product.style_code && `Style ${product.style_code}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <EntPassportPill state={product.passport_state} />
                      {product.blockingIssueCount ? (
                        <span className="text-[11px] font-medium text-[var(--ent-raspberry)]">
                          {product.blockingIssueCount} priority fix{product.blockingIssueCount === 1 ? "" : "es"}
                        </span>
                      ) : product.openIssueCount ? (
                        <span className="text-[11px] text-[var(--ent-raspberry)]">{product.openIssueCount} issue{product.openIssueCount === 1 ? "" : "s"}</span>
                      ) : (
                        <span className="text-[11px] text-[var(--ent-muted-light)]">Open →</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        </>
      )}

      {catalog.total > catalog.pageSize ? (
        <p className="text-xs text-[var(--ent-muted-light)] mt-8">
          Showing {(catalog.page - 1) * catalog.pageSize + 1}–{Math.min(catalog.page * catalog.pageSize, catalog.total)} of {catalog.total}
          {catalog.page > 1 ? (
            <>
              {" · "}
              <Link className={entLinkClass} href={catalogHref(catalog.page - 1)}>
                Previous
              </Link>
            </>
          ) : null}
          {catalog.page < totalPages ? (
            <>
              {" · "}
              <Link className={entLinkClass} href={catalogHref(catalog.page + 1)}>
                Next
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </EntModulePage>
  );
}
