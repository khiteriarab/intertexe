"use client";

import { useCallback, useState } from "react";
import { lookupDemoRecord } from "../../../lib/material-intelligence/demo-records";
import { demoCurl, jsExample, prodCurl, pythonExample, SAMPLE_GTINS } from "./api-docs-shared";

type CodeTab = "curl" | "javascript" | "python";
type Mode = "demo" | "production";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className="text-[10px] tracking-[0.1em] uppercase border border-white/15 bg-white/5 text-white/70 px-2.5 py-1 rounded-md hover:bg-white/10"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ApiCodePanel({ mode = "demo" }: { mode?: Mode }) {
  const [tab, setTab] = useState<CodeTab>("curl");
  const [showJson, setShowJson] = useState(false);
  const sample = lookupDemoRecord(SAMPLE_GTINS.verified);

  const code =
    tab === "curl"
      ? mode === "demo"
        ? demoCurl()
        : prodCurl()
      : tab === "javascript"
        ? jsExample()
        : pythonExample();

  const jsonPreview = sample
    ? JSON.stringify(
        {
          api_version: "v1",
          request_id: "req_sample",
          data: {
            product: sample.product,
            composition: sample.composition,
            evidence: { status: sample.evidence.status },
            dpp_alignment: { status: sample.dpp_alignment.status },
          },
        },
        null,
        2
      )
    : "";

  return (
    <div className="api-docs-request-response">
      <div className="api-docs-code-panel">
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/08">
          <div className="api-docs-code-tabs !border-0" role="tablist">
            {(
              [
                ["curl", "cURL"],
                ["javascript", "JavaScript"],
                ["python", "Python"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`api-docs-code-tab ${tab === id ? "api-docs-code-tab--active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <CopyButton text={code} />
        </div>
        <pre className="api-docs-code-pre">
          <code>{code}</code>
        </pre>
      </div>

      <div className="rounded-xl border border-[var(--platform-border)] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-quiet)]">Structured response</p>
          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="text-[10px] tracking-[0.1em] uppercase text-[var(--platform-primary)] underline underline-offset-4"
          >
            {showJson ? "Hide raw JSON" : "View raw JSON"}
          </button>
        </div>

        {showJson ? (
          <pre className="text-[11px] leading-relaxed overflow-x-auto bg-[#f7f3ee] p-3 rounded-lg max-h-72 mb-4">
            {jsonPreview}
          </pre>
        ) : sample ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--platform-quiet)]">Product</dt>
              <dd className="text-[var(--platform-ink)]">{sample.product.name}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--platform-quiet)]">Composition</dt>
              <dd className="text-[var(--platform-ink)]">
                {sample.composition.components.map((c) => `${c.percentage}% ${c.fiber_name}`).join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--platform-quiet)]">Evidence</dt>
              <dd className="text-[var(--platform-ink)] capitalize">{sample.evidence.status.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--platform-quiet)]">DPP alignment</dt>
              <dd className="text-[var(--platform-ink)] capitalize">{sample.dpp_alignment.status.replace(/_/g, " ")}</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-4 text-xs text-[var(--platform-quiet)] leading-relaxed">
          Illustrative sample from the public demo fixture. Production responses follow the same envelope shape.
        </p>
      </div>
    </div>
  );
}
