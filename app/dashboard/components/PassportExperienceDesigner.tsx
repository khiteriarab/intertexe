"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConsumerPassportContent } from "../../../lib/enterprise/public-passport-content";
import type { DataCarrierRow } from "@/lib/enterprise/carriers";
import {
  DEFAULT_EXPERIENCE,
  TEMPLATE_META,
  type PassportExperienceBranding,
  type PassportExperienceConfig,
  type PassportTemplate,
} from "@/lib/enterprise/passport-experience";
import { PassportExperienceRenderer } from "../../p/components/PassportExperienceRenderer";
import { QrCodeActions } from "./QrCodeActions";
import { entButtonClass, entLabelClass } from "./EnterpriseUi";
import { accessClassLabel } from "@/lib/enterprise/access-classes";

type FieldRow = {
  id: string;
  fieldKey: string;
  label: string;
  value: string;
  accessClass: string;
  canToggle: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  composition: "Composition",
  manufacturing_country: "Manufacturing country",
  manufacturer: "Manufacturer",
  facility: "Factory / facility",
  material_origin: "Material origin",
  certification: "Certifications",
  supplier_name: "Supplier name",
  care_instructions: "Care instructions",
  repair: "Repair guidance",
  color: "Color",
  gtin: "GTIN",
  sku: "SKU",
};

export function PassportExperienceDesigner({
  slug,
  productId,
  canMutate,
  publishReady,
  published,
  publicId,
  absoluteUrl,
  carriers,
  experience: initialExperience,
  content,
  fields,
  versionNumber,
}: {
  slug: string;
  productId: string;
  canMutate: boolean;
  publishReady: boolean;
  published: boolean;
  publicId: string | null;
  absoluteUrl: string | null;
  carriers: DataCarrierRow[];
  experience: PassportExperienceConfig;
  content: ConsumerPassportContent;
  fields: FieldRow[];
  versionNumber?: number;
}) {
  const router = useRouter();
  const [experience, setExperience] = useState(initialExperience);
  const [previewTab, setPreviewTab] = useState<"mobile" | "desktop" | "qr">("mobile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldRows, setFieldRows] = useState(fields);

  const previewExperience = useMemo(() => experience, [experience]);

  const saveExperience = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: experience.template,
          branding: experience.branding,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not save experience.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }, [slug, productId, experience, router]);

  async function toggleFieldVisibility(fieldId: string, nextClass: "public" | "internal") {
    if (!canMutate) return;
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/org/${slug}/products/${productId}/field-visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, accessClass: nextClass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update visibility.");
      setFieldRows((rows) =>
        rows.map((r) => (r.id === fieldId ? { ...r, accessClass: nextClass } : r))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visibility update failed.");
    }
  }

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-8 items-start">
      <div className="space-y-6">
        <div className="ent-float-card p-6 md:p-8">
          <p className="ent-journey-eyebrow">Passport experience</p>
          <h2 className="ent-serif text-2xl text-[var(--ent-ink)] mt-2">Experience designer</h2>
          <p className="text-sm text-[var(--ent-muted)] mt-2 leading-relaxed">
            Same governed data — brand-controlled presentation. Configure what consumers see when they scan your product.
          </p>
        </div>

        <div className="ent-float-card p-6 md:p-8">
          <p className={entLabelClass}>What consumers see</p>
          <ul className="mt-4 space-y-2">
            <li className="ent-panel-nested px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <span>Product image</span>
              <span className="text-[var(--ent-forest)] text-xs font-semibold uppercase tracking-wide">Public</span>
            </li>
            {fieldRows.map((field) => {
              const isPublic = field.accessClass === "public";
              return (
                <li key={field.id} className="ent-panel-nested px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--ent-ink)]">{field.label}</span>
                    <button
                      type="button"
                      disabled={!canMutate || !field.canToggle}
                      onClick={() => toggleFieldVisibility(field.id, isPublic ? "internal" : "public")}
                      className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
                        isPublic
                          ? "text-[var(--ent-forest)] bg-[rgba(44,74,62,0.08)]"
                          : "text-[var(--ent-muted-light)] bg-[rgba(26,31,34,0.06)]"
                      }`}
                    >
                      {isPublic ? "Public" : "Hidden"}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ent-muted)] mt-1 truncate">{field.value || "—"}</p>
                  <p className="text-[10px] text-[var(--ent-muted-light)] mt-1">{accessClassLabel(field.accessClass)}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="ent-float-card p-6 md:p-8">
          <p className={entLabelClass}>Experience template</p>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {(Object.keys(TEMPLATE_META) as PassportTemplate[]).map((key) => (
              <label
                key={key}
                className={`ent-carrier-option cursor-pointer ${
                  experience.template === key ? "ent-carrier-option--selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="experience-template"
                  checked={experience.template === key}
                  onChange={() => setExperience((e) => ({ ...e, template: key }))}
                  className="ent-carrier-radio"
                />
                <span>
                  <span className="font-medium text-[var(--ent-ink)]">{TEMPLATE_META[key].label}</span>
                  <span className="block text-xs text-[var(--ent-muted)] mt-1">{TEMPLATE_META[key].description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="ent-float-card p-6 md:p-8">
          <p className={entLabelClass}>Branding</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
            <label className="block">
              <span className="text-xs text-[var(--ent-muted)]">Brand display name</span>
              <input
                className="ent-input w-full mt-1 px-3 py-2 rounded-lg border"
                value={experience.branding.brandDisplayName || ""}
                onChange={(e) =>
                  setExperience((ex) => ({
                    ...ex,
                    branding: { ...ex.branding, brandDisplayName: e.target.value || null },
                  }))
                }
                placeholder="Leave blank to use catalog brand"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--ent-muted)]">Accent color</span>
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-lg border"
                value={experience.branding.accentColor || DEFAULT_EXPERIENCE.branding.accentColor}
                onChange={(e) =>
                  setExperience((ex) => ({
                    ...ex,
                    branding: { ...ex.branding, accentColor: e.target.value },
                  }))
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--ent-muted)]">Editorial copy</span>
              <textarea
                className="ent-input w-full mt-1 px-3 py-2 rounded-lg border min-h-[80px]"
                value={experience.branding.editorialCopy || ""}
                onChange={(e) =>
                  setExperience((ex) => ({
                    ...ex,
                    branding: { ...ex.branding, editorialCopy: e.target.value || null },
                  }))
                }
                placeholder="Optional storytelling line for Editorial template"
              />
            </label>
          </div>
        </div>

        <div className="ent-float-card p-6 md:p-8">
          <p className={entLabelClass}>Domain</p>
          <p className="text-sm text-[var(--ent-ink)] mt-2 font-mono break-all">
            {absoluteUrl || (publicId ? `intertexe.com/p/${publicId}` : "Publish to allocate public identity")}
          </p>
          <p className="text-xs text-[var(--ent-muted-light)] mt-2">
            Custom domain (passport.brand.com) available on Enterprise plan.
          </p>
        </div>

        {error ? <p className="text-sm text-[var(--ent-raspberry)]">{error}</p> : null}

        {canMutate ? (
          <button type="button" className={entButtonClass} disabled={busy} onClick={saveExperience}>
            {busy ? "Saving…" : "Save experience"}
          </button>
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-8 space-y-4">
        <div className="ent-float-card p-5 md:p-6">
          <p className="ent-heading text-base text-[var(--ent-ink)] mb-3">Consumer preview</p>
          <div className="ent-product-tabs mb-4">
            {(["mobile", "desktop", "qr"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={`ent-product-tab ${previewTab === id ? "is-active" : ""}`}
                onClick={() => setPreviewTab(id)}
              >
                {id === "mobile" ? "📱 Mobile" : id === "desktop" ? "Desktop" : "QR"}
              </button>
            ))}
          </div>

          {previewTab === "qr" && absoluteUrl && publicId ? (
            <QrCodeActions url={absoluteUrl} publicId={publicId} size={96} />
          ) : null}

          {previewTab !== "qr" ? (
            <div
              className={`rounded-[1.25rem] overflow-hidden border border-[var(--ent-border)] ${
                previewTab === "mobile" ? "max-w-[390px] mx-auto max-h-[70vh] overflow-y-auto" : ""
              }`}
            >
              <PassportExperienceRenderer
                content={content}
                experience={previewExperience}
                publicId={publicId || "preview"}
                versionNumber={versionNumber}
                preview
                compact={previewTab === "mobile"}
              />
            </div>
          ) : null}

          {!published ? (
            <p className={`${entLabelClass} mt-3`}>Live preview — publish to activate resolver.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function buildFieldRows(
  fields: Array<{
    id: string;
    field_key: string;
    normalized_value?: string | null;
    original_value?: string | null;
    access_class?: string | null;
  }>
): FieldRow[] {
  const keys = [
    "composition",
    "manufacturing_country",
    "manufacturer",
    "facility",
    "material_origin",
    "certification",
    "supplier_name",
    "care_instructions",
    "repair",
    "color",
  ];
  return fields
    .filter((f) => keys.includes(f.field_key))
    .map((f) => ({
      id: f.id,
      fieldKey: f.field_key,
      label: FIELD_LABELS[f.field_key] || f.field_key,
      value: String(f.normalized_value || f.original_value || ""),
      accessClass: f.access_class || "internal",
      canToggle: !["composition", "manufacturing_country"].includes(f.field_key),
    }));
}
