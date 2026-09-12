"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ConsumerPassportContent } from "../../../../lib/enterprise/public-passport-content";
import type { MarketplaceProvider } from "../../../../lib/resale/types";
import "../../passport.css";

type ProviderSummary = {
  id: MarketplaceProvider;
  displayName: string;
  integrationStatus: string;
  capabilities: Record<string, boolean>;
};

type ListingResult = {
  provider: MarketplaceProvider;
  status: string;
  externalUrl?: string | null;
  errorMessage?: string;
  handoffPackage?: { continueUrl: string; title: string };
};

const STEPS = ["Confirm", "Condition", "Photos", "Pricing", "Marketplaces"] as const;

const CONDITIONS = [
  { id: "new", label: "New / unworn" },
  { id: "excellent", label: "Excellent" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
] as const;

export default function ResaleSellClient({
  publicId,
  content,
  providers,
}: {
  publicId: string;
  content: ConsumerPassportContent;
  providers: ProviderSummary[];
}) {
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<string>("excellent");
  const [notes, setNotes] = useState("");
  const [flaws, setFlaws] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [selected, setSelected] = useState<MarketplaceProvider[]>(["ebay"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingResult[] | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const blocked = content.resaleEligible === false;

  const providerLabel = useMemo(() => {
    const map: Record<string, string> = {
      live: "Live",
      requires_partner_access: "Requires partner access",
      handoff: "Handoff",
      disconnected: "Not connected",
    };
    return map;
  }, []);

  async function ensureAuth(): Promise<string | null> {
    if (accessToken) return accessToken;
    const stored = typeof window !== "undefined" ? localStorage.getItem("sb-access-token") : null;
    if (stored) {
      setAccessToken(stored);
      return stored;
    }
    setError("Sign in to connect marketplaces and publish. Your draft is saved on this device.");
    return null;
  }

  function addPhotoUrl() {
    const url = window.prompt("Paste photo URL (consumer-uploaded image)");
    if (url?.trim()) setPhotos((p) => [...p, url.trim()]);
  }

  async function submitListing() {
    setBusy(true);
    setError(null);
    const token = await ensureAuth();
    if (!token) {
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/resale/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publicId,
          conditionGrade: condition,
          conditionNotes: notes || undefined,
          flaws: flaws || undefined,
          askingPrice: Number(price),
          minimumPrice: minPrice ? Number(minPrice) : undefined,
          currency: "USD",
          consumerPhotos: photos,
          providers: selected,
          publish: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Listing failed");
        return;
      }
      setListings(data.listings || []);
      setStep(STEPS.length);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <main className="itx-passport">
        <div className="itx-passport-inner itx-resale-flow">
          <p className="itx-passport-brand">INTERTEXE · Next Life</p>
          <h1 className="itx-passport-product-name text-2xl">Resale blocked</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-3">
            Passport data must be validated before this item can be listed. Status:{" "}
            <strong>{content.integrityStatus}</strong>
          </p>
          <Link href={`/p/${publicId}`} className="itx-resale-back mt-6 inline-block">
            ← Back to passport
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="itx-passport">
      <div className="itx-passport-inner itx-resale-flow">
        <p className="itx-passport-brand">INTERTEXE · Next Life</p>
        <h1 className="text-xl font-medium tracking-tight">Sell this item</h1>
        <p className="text-xs text-[var(--pp-muted)] mt-1">{content.brand} · {content.productName}</p>

        <div className="itx-resale-steps mt-4">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? "active" : ""}>
              {label}
            </span>
          ))}
        </div>

        {step === 0 && (
          <section className="mt-6 space-y-4">
            {content.imageUrl ? (
              <div className="itx-passport-hero-image relative max-h-64">
                <Image src={content.imageUrl} alt="" fill className="object-cover" sizes="430px" unoptimized />
              </div>
            ) : null}
            <dl className="text-sm space-y-2">
              <div><dt className="text-[var(--pp-muted)]">Brand</dt><dd>{content.brand || "—"}</dd></div>
              <div><dt className="text-[var(--pp-muted)]">Composition</dt><dd>{content.composition || "—"}</dd></div>
              <div><dt className="text-[var(--pp-muted)]">Identity</dt><dd className="font-mono text-xs">{content.identifier || publicId}</dd></div>
            </dl>
            <p className="text-xs text-[var(--pp-muted)]">
              Retail photography may not be licensed for third-party resale. You will upload current photos in step 3.
            </p>
            <button type="button" className="itx-resale-primary w-full" onClick={() => setStep(1)}>
              Confirm product
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-6 space-y-4">
            <fieldset className="space-y-2">
              {CONDITIONS.map((c) => (
                <label key={c.id} className="itx-resale-radio flex gap-3 items-center">
                  <input type="radio" name="condition" checked={condition === c.id} onChange={() => setCondition(c.id)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </fieldset>
            <textarea
              className="itx-resale-input w-full"
              placeholder="Notes (optional)"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <textarea
              className="itx-resale-input w-full"
              placeholder="Flaws, repairs, alterations"
              rows={2}
              value={flaws}
              onChange={(e) => setFlaws(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="itx-resale-primary flex-1" onClick={() => setStep(2)}>Continue</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-4">
            <p className="text-sm">Add current photographs of the item you are selling.</p>
            <button type="button" className="itx-resale-secondary w-full" onClick={addPhotoUrl}>
              + Add photo URL
            </button>
            {photos.length > 0 && (
              <ul className="text-xs space-y-1 break-all">
                {photos.map((p) => (
                  <li key={p} className="text-[var(--pp-muted)]">{p}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(1)}>Back</button>
              <button
                type="button"
                className="itx-resale-primary flex-1"
                disabled={!photos.length}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 space-y-4">
            <label className="block text-sm">
              Asking price (USD)
              <input
                type="number"
                className="itx-resale-input w-full mt-1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={1}
              />
            </label>
            <label className="block text-sm">
              Minimum acceptable (optional)
              <input
                type="number"
                className="itx-resale-input w-full mt-1"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </label>
            <p className="text-xs text-[var(--pp-muted)]">INTERTEXE does not fabricate market pricing without a real data source.</p>
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(2)}>Back</button>
              <button
                type="button"
                className="itx-resale-primary flex-1"
                disabled={!price}
                onClick={() => setStep(4)}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 4 && !listings && (
          <section className="mt-6 space-y-4">
            <p className="text-sm font-medium">Choose marketplaces</p>
            {providers.map((p) => (
              <label key={p.id} className="itx-resale-marketplace flex gap-3 items-start">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={p.integrationStatus === "requires_partner_access" && !p.capabilities.listing_publish}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                    );
                  }}
                />
                <span>
                  <span className="font-medium">{p.displayName}</span>
                  <span className="block text-xs text-[var(--pp-muted)]">
                    {providerLabel[p.integrationStatus] || p.integrationStatus}
                    {p.id === "poshmark" ? " · Continue on Poshmark" : ""}
                  </span>
                </span>
              </label>
            ))}
            <Link href="/resale/connections" className="text-xs underline text-[var(--pp-petrol)]">
              Manage marketplace connections
            </Link>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(3)}>Back</button>
              <button
                type="button"
                className="itx-resale-primary flex-1"
                disabled={busy || !selected.length}
                onClick={submitListing}
              >
                {busy ? "Publishing…" : "Publish listings"}
              </button>
            </div>
          </section>
        )}

        {listings && (
          <section className="mt-6 space-y-4">
            <h2 className="font-medium">Resale distribution</h2>
            <ul className="space-y-3">
              {listings.map((l) => (
                <li key={l.provider} className="itx-resale-listing-row">
                  <p className="font-medium capitalize">{l.provider}</p>
                  <p className="text-sm">{l.status === "handoff" ? "Draft / Continue on Poshmark" : l.status}</p>
                  {l.externalUrl ? (
                    <a href={l.externalUrl} className="text-xs underline" target="_blank" rel="noreferrer">
                      View listing
                    </a>
                  ) : null}
                  {l.handoffPackage?.continueUrl ? (
                    <a href={l.handoffPackage.continueUrl} className="itx-resale-secondary inline-block mt-2 text-xs">
                      Continue on Poshmark
                    </a>
                  ) : null}
                  {l.errorMessage ? <p className="text-xs text-red-700">{l.errorMessage}</p> : null}
                </li>
              ))}
            </ul>
            <Link href={`/p/${publicId}`} className="itx-resale-back inline-block">
              ← Back to passport
            </Link>
          </section>
        )}

        <Link href={`/p/${publicId}`} className="itx-resale-back mt-8 inline-block text-xs">
          ← Passport
        </Link>
      </div>
    </main>
  );
}
