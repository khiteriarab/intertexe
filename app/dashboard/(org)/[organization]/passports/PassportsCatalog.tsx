"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import type { OrgPassportCatalogItem } from "../../../../../lib/enterprise/queries";
import { formatReviewerLine } from "../../../../../lib/enterprise/reviewer-display";
import {
  EntPassportPill,
  EntProductPlaceholder,
  entLinkClass,
} from "../../../components/EnterpriseUi";
import { PassportQr } from "./PassportQr";

export type PassportCatalogRow = OrgPassportCatalogItem & {
  imageUrl: string | null;
};

function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
}) {
  return (
    <div className="ent-segmented" role="group" aria-label="Passport view">
      <button
        type="button"
        className={`ent-segmented-link ${view === "list" ? "is-active" : ""}`}
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        List
      </button>
      <button
        type="button"
        className={`ent-segmented-link ${view === "grid" ? "is-active" : ""}`}
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
      >
        Grid
      </button>
    </div>
  );
}

function PassportListRow({
  item,
  base,
  origin,
  mode,
}: {
  item: PassportCatalogRow;
  base: string;
  origin: string;
  mode: "awaiting" | "published";
}) {
  const absoluteUrl = item.publicUrl.startsWith("http") ? item.publicUrl : `${origin}${item.publicUrl}`;
  const showQr = mode === "published" && (item.state === "published" || item.state === "update_required");
  const updatedAt = item.versions[item.versions.length - 1]?.published_at || item.updated_at;

  return (
    <li className="ent-passport-catalog-row">
      <EntProductPlaceholder
        category={item.productCategory}
        imageUrl={item.imageUrl}
        alt={item.productName}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--ent-muted-light)]">
          {mode === "published" ? "Digital passport" : item.hasPassportShell ? "Prepared identity" : "Awaiting publish"}
        </p>
        <p className="ent-serif text-[1.15rem] text-[var(--ent-ink)] line-clamp-1 mt-1">{item.productName}</p>
        {item.marketLabel ? (
          <p className="text-[10px] tracking-[0.08em] uppercase text-[var(--ent-muted-light)] mt-1">{item.marketLabel}</p>
        ) : null}
        {item.productSku ? (
          <p className="text-xs text-[var(--ent-muted-light)] mt-1">{item.productSku}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <EntPassportPill state={item.state} />
          {item.currentVersion ? (
            <span className="text-[11px] text-[var(--ent-muted-light)]">Version {item.currentVersion}</span>
          ) : null}
          {updatedAt ? (
            <span className="text-[11px] text-[var(--ent-muted-light)]">
              Updated{" "}
              {new Date(updatedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2 text-right">
        {showQr && item.public_id ? (
          <PassportQr url={absoluteUrl} publicId={item.public_id} variant="collapsible" />
        ) : item.public_id ? (
          <p className="font-mono text-[10px] text-[var(--ent-muted-light)] max-w-[10rem] truncate">{item.public_id}</p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          <Link className={entLinkClass} href={`${base}/products/${item.productId}`}>
            Open product →
          </Link>
          {showQr && item.public_id ? (
            <Link className={entLinkClass} href={`/p/${item.public_id}`}>
              View passport →
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function PassportGridCard({
  item,
  base,
  origin,
  mode,
}: {
  item: PassportCatalogRow;
  base: string;
  origin: string;
  mode: "awaiting" | "published";
}) {
  const absoluteUrl = item.publicUrl.startsWith("http") ? item.publicUrl : `${origin}${item.publicUrl}`;
  const showQr = mode === "published" && (item.state === "published" || item.state === "update_required");
  const updatedAt = item.versions[item.versions.length - 1]?.published_at || item.updated_at;
  const isPublished = mode === "published";

  return (
    <li className="ent-passport-object">
      <div
        className="px-6 py-5 md:px-7 md:py-6 flex gap-4"
        style={{ background: isPublished ? "var(--ent-gradient-hero)" : "var(--ent-gradient-stone)" }}
      >
        <EntProductPlaceholder
          category={item.productCategory}
          imageUrl={item.imageUrl}
          alt={item.productName}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] tracking-[0.14em] uppercase ${isPublished ? "text-white/45" : "text-[var(--ent-muted-light)]"}`}
          >
            {isPublished ? "Digital passport" : item.hasPassportShell ? "Prepared identity" : "Awaiting publish"}
          </p>
          <h3
            className={`ent-serif text-[1.45rem] md:text-[1.6rem] mt-1 leading-tight line-clamp-2 ${isPublished ? "text-white" : "text-[var(--ent-ink)]"}`}
          >
            {item.productName}
          </h3>
          {item.marketLabel ? (
            <p className={`text-[10px] tracking-[0.08em] uppercase mt-1 ${isPublished ? "text-white/45" : "text-[var(--ent-muted-light)]"}`}>
              {item.marketLabel}
            </p>
          ) : null}
          {item.productSku ? (
            <p className={`text-xs mt-1 ${isPublished ? "text-white/55" : "text-[var(--ent-muted-light)]"}`}>
              {item.productSku}
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <EntPassportPill state={item.state} />
            {item.currentVersion ? (
              <p className={`text-xs uppercase tracking-wide ${isPublished ? "text-white/50" : "text-[var(--ent-muted-light)]"}`}>
                Version {item.currentVersion}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-6 py-5 md:px-7 md:py-6 bg-white border-t border-[var(--ent-border)] space-y-4">
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
          <PassportQr url={absoluteUrl} publicId={item.public_id!} variant="collapsible" />
        ) : item.public_id ? (
          <p className="font-mono text-xs text-[var(--ent-muted-light)] break-all">{item.public_id}</p>
        ) : null}

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link className={entLinkClass} href={`${base}/products/${item.productId}`}>
            Open product →
          </Link>
          {showQr ? (
            <Link className={entLinkClass} href={`/p/${item.public_id}`}>
              View passport →
            </Link>
          ) : null}
        </div>

        {item.versions.length > 1 ? (
          <div className="pt-3 border-t border-[var(--ent-border)]">
            <ul className="text-xs text-[var(--ent-muted)] space-y-1">
              {item.versions.slice(0, 3).map((version) => (
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
}

function PassportSection({
  title,
  items,
  view,
  base,
  origin,
  mode,
  empty,
}: {
  title: string;
  items: PassportCatalogRow[];
  view: "grid" | "list";
  base: string;
  origin: string;
  mode: "awaiting" | "published";
  empty?: ReactNode | null;
}) {
  if (items.length === 0) return empty ? <>{empty}</> : null;

  return (
    <section className="mb-12 last:mb-0">
      <h2 className="ent-serif text-[1.5rem] text-[var(--ent-ink)] mb-5">{title}</h2>
      {view === "list" ? (
        <ul className="ent-passport-catalog-list">
          {items.map((item) => (
            <PassportListRow key={item.id} item={item} base={base} origin={origin} mode={mode} />
          ))}
        </ul>
      ) : (
        <ul className="ent-passport-catalog-grid">
          {items.map((item) => (
            <PassportGridCard key={item.id} item={item} base={base} origin={origin} mode={mode} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function PassportsCatalog({
  slug,
  origin,
  awaitingPublish,
  published,
  duplicateNote,
}: {
  slug: string;
  origin: string;
  awaitingPublish: PassportCatalogRow[];
  published: PassportCatalogRow[];
  duplicateNote?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const view: "grid" | "list" = viewParam === "grid" ? "grid" : "list";
  const base = `/dashboard/${slug}`;

  const setView = useCallback(
    (next: "grid" | "list") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "list") params.delete("view");
      else params.set("view", next);
      const qs = params.toString();
      router.replace(qs ? `${base}/passports?${qs}` : `${base}/passports`, { scroll: false });
    },
    [base, router, searchParams]
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <ViewToggle view={view} onChange={setView} />
        {duplicateNote ? (
          <p className="text-xs text-[var(--ent-muted-light)] max-w-md">{duplicateNote}</p>
        ) : null}
      </div>

      <PassportSection
        title="Ready to publish"
        items={awaitingPublish}
        view={view}
        base={base}
        origin={origin}
        mode="awaiting"
      />

      {published.length > 0 ? (
        <PassportSection
          title="Published identities"
          items={published}
          view={view}
          base={base}
          origin={origin}
          mode="published"
        />
      ) : null}
    </>
  );
}
