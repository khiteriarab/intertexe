"use client";

import { useState } from "react";
import { ConsumerPassportPage } from "../../p/components/ConsumerPassportPage";
import type { ConsumerPassportContent } from "../../../lib/enterprise/public-passport-content";
import { QrCodeActions } from "./QrCodeActions";
import { entLabelClass } from "./EnterpriseUi";

type PreviewTab = "desktop" | "mobile" | "qr";

export function PassportPreviewPanel({
  content,
  publicId,
  absoluteUrl,
  versionNumber,
  published,
}: {
  content: ConsumerPassportContent;
  publicId: string | null;
  absoluteUrl: string | null;
  versionNumber?: number;
  published: boolean;
}) {
  const [tab, setTab] = useState<PreviewTab>("mobile");

  return (
    <div className="ent-float-card p-6 md:p-8">
      <p className="ent-heading text-lg text-[var(--ent-ink)] mb-1">Passport preview</p>
      <p className="text-sm text-[var(--ent-muted)] mb-4 leading-relaxed">
        See exactly what consumers will experience when they scan the QR code.
      </p>

      <div className="ent-product-tabs mb-4">
        {(
          [
            ["mobile", "Mobile"],
            ["desktop", "Desktop"],
            ["qr", "QR code"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`ent-product-tab ${tab === id ? "is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "qr" && publicId ? (
        <QrCodeActions url={absoluteUrl || `/p/${publicId}`} publicId={publicId} />
      ) : tab === "qr" ? (
        <p className="text-sm text-[var(--ent-muted)]">Identity provisioning in progress — reload in a moment.</p>
      ) : null}

      {tab !== "qr" ? (
        <div
          className={`rounded-[1.25rem] overflow-hidden border border-[var(--ent-border)] bg-[var(--ent-cream)] ${
            tab === "mobile" ? "max-w-[390px] mx-auto shadow-[var(--ent-shadow)]" : ""
          }`}
        >
          <div className={tab === "mobile" ? "max-h-[70vh] overflow-y-auto" : ""}>
            <ConsumerPassportPage
              content={content}
              publicId={publicId || "preview"}
              versionNumber={versionNumber}
              preview
              compact={tab === "mobile"}
            />
          </div>
        </div>
      ) : null}

      {!published ? (
        <p className={`${entLabelClass} mt-4`}>
          Preview uses approved public fields. Publish to activate the live resolver.
        </p>
      ) : null}
    </div>
  );
}
