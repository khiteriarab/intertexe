"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PreviewResponse = {
  columns: string[];
  rowCount: number;
  suggested: Array<{ sourceColumn: string; canonicalField: string | null; confidence: string }>;
  mapping: Record<string, string>;
  preview: {
    estimatedNewProducts: number;
    estimatedUpdates: number;
    duplicateRisk: number;
    parsingWarnings: string[];
  };
  message?: string;
};

const CANONICAL = [
  "",
  "name",
  "sku",
  "gtin",
  "style_code",
  "variant",
  "category",
  "composition",
  "manufacturing_country",
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
      body: JSON.stringify({ csv: fileText, mapping }),
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
    setMessage(`Imported ${data.productsTouched} products. ${data.issuesCreated} issues opened.`);
    router.refresh();
  }

  if (!canMutate) return null;

  return (
    <section className="bg-white border border-black/10 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-medium">Upload catalog</h2>
      <p className="text-sm text-black/55 mt-1">
        CSV or paste rows. Map your columns, review the preview, then confirm. Raw source rows are
        stored immutably.
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
            onChange={(e) => setFileText(e.target.value)}
            rows={8}
            className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 font-mono text-xs"
            placeholder={"STYLE_NO,MATERIAL_1,SKU,NAME\nST-1,100% cotton,SKU-1,Tee"}
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
            {preview.preview.estimatedUpdates} updates · {preview.preview.duplicateRisk} duplicate
            SKU risks
          </p>
          <div className="space-y-2">
            {preview.columns.map((column) => (
              <label key={column} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate font-mono text-xs">{column}</span>
                <select
                  className="border border-black/15 rounded px-2 py-1"
                  value={mapping[column] || ""}
                  onChange={(e) => setMapping((current) => ({ ...current, [column]: e.target.value }))}
                >
                  {CANONICAL.map((field) => (
                    <option key={field || "none"} value={field}>
                      {field || "ignore"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCommit}
            className="text-xs tracking-widest uppercase border border-black/20 px-4 py-2"
          >
            Confirm import
          </button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-black/60 mt-3">{message}</p> : null}
    </section>
  );
}
