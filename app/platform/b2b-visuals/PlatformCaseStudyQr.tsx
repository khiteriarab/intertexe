"use client";

import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { caseStudyPassportUrl, PASSPORT_CASE_STUDY } from "../../../lib/enterprise/passport-case-study";
import { SERIF } from "../platform-ui";

export function PlatformCaseStudyQr({ compact = false }: { compact?: boolean }) {
  const url = caseStudyPassportUrl();
  const size = compact ? 96 : 120;

  return (
    <div className="rounded-xl border border-[var(--platform-border)] bg-white/95 p-4 sm:p-5 text-center">
      <div className="inline-block bg-white p-2 rounded-lg border border-[var(--platform-border)] shadow-sm">
        <QRCodeCanvas value={url} size={size} marginSize={1} />
      </div>
      <p className="text-[10px] tracking-[0.14em] uppercase text-[var(--platform-muted)] mt-3">
        Live case study · scan with iPhone
      </p>
      <p className="font-mono text-[10px] text-[var(--platform-primary)] mt-1 break-all">
        {PASSPORT_CASE_STUDY.publicId}
      </p>
      <Link
        href={`/p/${PASSPORT_CASE_STUDY.publicId}`}
        className="inline-block mt-3 text-[11px] tracking-[0.12em] uppercase underline underline-offset-4"
        style={{ color: "var(--platform-accent)" }}
      >
        Open passport →
      </Link>
      {!compact ? (
        <p className="text-xs text-[var(--platform-muted)] mt-4 leading-relaxed" style={SERIF}>
          {PASSPORT_CASE_STUDY.brand} · {PASSPORT_CASE_STUDY.composition}
        </p>
      ) : null}
    </div>
  );
}
