"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  entButtonClass,
  entButtonGhostClass,
  entInputClass,
  entLabelClass,
  entMetaClass,
  entSelectClass,
} from "../../../components/EnterpriseUi";

type PreviewResponse = {
  columns: string[];
  rowCount: number;
  suggested: Array<{ sourceColumn: string; canonicalField: string | null; confidence: string }>;
  mapping: Record<string, string>;
  mappingSource?: string;
  preview: {
    estimatedNewProducts: number;
    estimatedUpdates: number;
    duplicateRisk: number;
    parsingWarnings: string[];
    reconciliations?: Array<{
      rowIndex: number;
      action: string;
      classification: string | null;
      matchOn: string | null;
      identifierValue: string | null;
      matchedLabel: string | null;
    }>;
  };
  message?: string;
};

const CANONICAL: Array<{ value: string; label: string }> = [
  { value: "", label: "Ignore" },
  { value: "name", label: "Product name" },
  { value: "sku", label: "SKU" },
  { value: "gtin", label: "GTIN / EAN" },
  { value: "style_code", label: "Style code" },
  { value: "variant", label: "Variant / color" },
  { value: "category", label: "Category" },
  { value: "composition", label: "Composition" },
  { value: "manufacturing_country", label: "Country of origin" },
];

export function CatalogImportClient({
  slug,
  canMutate,
}: {
  slug: string;
  canMutate: boolean;
}) {
  const router = useRouter();
  const [fileText, setFileText] = useState("");
  const [filename, setFilename] = useState("upload.csv");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPreview(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/imports/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        csv: fileText,
        mapping: preview ? mapping : undefined,
      }),
    });
    const data = (await res.json()) as PreviewResponse;
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Preview failed.");
      return;
    }
    setPreview(data);
    setMapping(data.mapping || {});
  }

  async function onCommit() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/dashboard/org/${slug}/imports/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: fileText, mapping, filename }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message || "Import failed.");
      return;
    }
    if (data.alreadyImported) {
      setMessage("This exact file was already imported. Change a row or mapping to run it again — duplicate GTINs are not silently merged on a new import.");
      router.refresh();
      return;
    }
    const collisions = Array.isArray(data.reconciliations)
      ? data.reconciliations.filter((row: { action: string }) => row.action === "create_with_collision").length
      : 0;
    const updates = Array.isArray(data.reconciliations)
      ? data.reconciliations.filter((row: { action: string }) => row.action === "update_same_product").length
      : 0;
    const issuesOpened = data.issuesOpened ?? data.issuesCreated ?? 0;
    setMessage(
      `Imported ${data.productsTouched} products. ${issuesOpened} issues opened.` +
        (updates || collisions
          ? ` ${updates} same-product updates; ${collisions} identifier collisions kept separate — review them on Issues.`
          : "")
    );
    const next = new URLSearchParams();
    next.set("imported", String(data.productsTouched ?? 0));
    next.set("issues", String(issuesOpened));
    if (collisions) next.set("collisions", String(collisions));
    router.replace(`/dashboard/${slug}/products?${next.toString()}`);
    router.refresh();
  }

  if (!canMutate) return null;

  return (
    <div>
      <h2 className="ent-heading text-lg text-[var(--ent-ink)]">Upload catalog</h2>
      <p className={`text-sm text-[var(--ent-muted)] mt-2 max-w-2xl leading-relaxed`}>
        INTERTEXE reads your rows, suggests obvious columns, and shows identifier matches before anything is saved.
        Confirm the mapping, then confirm import. Colliding GTINs or SKUs are not silently merged.
      </p>
      <form onSubmit={onPreview} className="mt-6 space-y-4">
        <label className="block text-sm text-[var(--ent-ink-soft)]">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="mt-2 block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFilename(file.name);
              setFileText(await file.text());
              setPreview(null);
            }}
          />
        </label>
        <label className="block text-sm text-[var(--ent-ink-soft)]">
          File name
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className={`mt-2 w-full ${entInputClass}`}
          />
        </label>
        <label className="block text-sm text-[var(--ent-ink-soft)]">
          CSV
          <textarea
            required
            value={fileText}
            onChange={(e) => {
              setFileText(e.target.value);
              setPreview(null);
            }}
            rows={8}
            className={`mt-2 w-full font-mono text-xs ${entInputClass}`}
            placeholder={"SKU,Product Name,Composition\nSKU-1,Oxford shirt,100% Cotton"}
          />
        </label>
        <button type="submit" disabled={busy} className={entButtonClass}>
          Preview import
        </button>
      </form>

      {preview ? (
        <div className="mt-8 ent-panel-nested p-5 md:p-6 space-y-4">
          <p className="text-sm text-[var(--ent-ink-soft)]">
            {preview.rowCount} rows · {preview.preview.estimatedNewProducts} new ·{" "}
            {preview.preview.estimatedUpdates} same-product updates · {preview.preview.duplicateRisk}{" "}
            identifier collisions kept separate
            {preview.mappingSource === "saved_template" ? " · mapping recalled from a previous file" : ""}
          </p>
          {preview.preview.parsingWarnings.length ? (
            <ul className="text-sm text-[var(--ent-muted)] list-disc pl-5 space-y-1">
              {preview.preview.parsingWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-3">
            {preview.columns.map((column) => {
              const suggestion = preview.suggested.find((row) => row.sourceColumn === column);
              return (
                <label key={column} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-40 truncate font-mono text-xs text-[var(--ent-muted)]">{column}</span>
                  <select
                    className={`${entSelectClass} text-sm py-2`}
                    value={mapping[column] || ""}
                    onChange={(e) => setMapping((current) => ({ ...current, [column]: e.target.value }))}
                  >
                    {CANONICAL.map((field) => (
                      <option key={field.value || "none"} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <span className={`${entMetaClass}`}>
                    {suggestion?.confidence === "high" && suggestion.canonicalField
                      ? "Suggested (high confidence)"
                      : suggestion?.confidence === "medium" && suggestion.canonicalField
                        ? `Possible ${suggestion.canonicalField} — not auto-mapped`
                        : "Not mapped"}
                  </span>
                </label>
              );
            })}
          </div>
          <button type="button" disabled={busy} onClick={onCommit} className={entButtonGhostClass}>
            Confirm import
          </button>
          <p className={`${entMetaClass}`}>
            Next: open Issues for collisions and missing fields, then review a product and publish its passport when ready.
          </p>
        </div>
      ) : null}
      {message ? <p className="text-sm text-[var(--ent-muted)] mt-4">{message}</p> : null}
    </div>
  );
}
