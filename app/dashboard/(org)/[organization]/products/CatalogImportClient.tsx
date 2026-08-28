"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    <section className="bg-white border border-black/10 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-medium">Upload catalog</h2>
      <p className="text-sm text-black/55 mt-1">
        What happens: INTERTEXE reads your rows, suggests obvious columns, and shows identifier
        matches before anything is saved. What we need: confirm the mapping, then Confirm import.
        Colliding GTINs or SKUs are not silently merged.
      </p>
      <form onSubmit={onPreview} className="mt-4 space-y-3">
        <label className="block text-sm">
          Upload CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="mt-1 block w-full text-sm"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFilename(file.name);
              setFileText(await file.text());
              setPreview(null);
            }}
          />
        </label>
        <label className="block text-sm">
          File name
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          CSV
          <textarea
            required
            value={fileText}
            onChange={(e) => {
              setFileText(e.target.value);
              setPreview(null);
            }}
            rows={8}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 font-mono text-xs"
            placeholder={"SKU,Product Name,Composition\nSKU-1,Oxford shirt,100% Cotton"}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="text-xs tracking-widest uppercase bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          Preview import
        </button>
      </form>

      {preview ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm">
            {preview.rowCount} rows · {preview.preview.estimatedNewProducts} new ·{" "}
            {preview.preview.estimatedUpdates} same-product updates · {preview.preview.duplicateRisk}{" "}
            identifier collisions kept separate
            {preview.mappingSource === "saved_template" ? " · mapping recalled from a previous file" : ""}
          </p>
          {preview.preview.parsingWarnings.length ? (
            <ul className="text-sm text-black/70 list-disc pl-5 space-y-1">
              {preview.preview.parsingWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-2">
            {preview.columns.map((column) => {
              const suggestion = preview.suggested.find((row) => row.sourceColumn === column);
              return (
                <label key={column} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="w-40 truncate font-mono text-xs">{column}</span>
                  <select
                    className="border border-black/15 rounded px-2 py-1"
                    value={mapping[column] || ""}
                    onChange={(e) => setMapping((current) => ({ ...current, [column]: e.target.value }))}
                  >
                    {CANONICAL.map((field) => (
                      <option key={field.value || "none"} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-black/45">
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
          <button
            type="button"
            disabled={busy}
            onClick={onCommit}
            className="text-xs tracking-widest uppercase border border-black/20 px-4 py-2"
          >
            Confirm import
          </button>
          <p className="text-xs text-black/45">
            Next: open Issues for collisions and missing fields, then review a product and publish
            its passport when ready.
          </p>
        </div>
      ) : null}
      {message ? <p className="text-sm text-black/60 mt-3">{message}</p> : null}
    </section>
  );
}
