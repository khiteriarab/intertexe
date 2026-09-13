"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
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
    <button type="button" onClick={copy} className="api-editorial-code-copy">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ApiCodePanel({ mode = "demo" }: { mode?: Mode }) {
  const [tab, setTab] = useState<CodeTab>("curl");
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
    <div className="api-editorial-code-split">
      <div className="api-editorial-code-panel">
        <div className="api-editorial-code-panel-header">
          <div className="api-editorial-code-tabs" role="tablist">
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
                className={tab === id ? "is-active" : undefined}
              >
                {label}
              </button>
            ))}
          </div>
          <CopyButton text={code} />
        </div>
        <pre className="api-editorial-code-pre">
          <code>{code}</code>
        </pre>
      </div>

      <div className="api-editorial-response-panel">
        <p className="api-editorial-response-label">Example response (truncated)</p>
        <pre className="api-editorial-response-pre">{jsonPreview}</pre>
      </div>
    </div>
  );
}

export function ApiCodeExamplesSection({ mode = "demo" }: { mode?: Mode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-lg text-[var(--platform-ink)]" style={{ fontFamily: "var(--itx-serif, Georgia, serif)" }}>
          Code examples
        </h3>
        <Link href="#quickstart" className="api-editorial-access-link">
          Try it yourself →
        </Link>
      </div>
      <ApiCodePanel mode={mode} />
    </div>
  );
}
