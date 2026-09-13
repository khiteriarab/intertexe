"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConsumerPassportContent } from "../../../../lib/enterprise/public-passport-content";
import type {
  MarketplaceProvider,
  ResaleRouteKind,
  ResaleRouteOption,
  ResaleValuation,
} from "../../../../lib/resale/types";
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

type SessionPayload = {
  sessionId: string;
  valuation: ResaleValuation;
  routes: ResaleRouteOption[];
  listingDraft?: { title?: string; description?: string; askingPrice?: number; currency?: string };
};

const STEPS = ["Value", "Route", "Details", "Photos", "Publish"] as const;

const CONDITIONS = [
  { id: "new", label: "New / unworn" },
  { id: "excellent", label: "Excellent" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
] as const;

function money(currency: string, amount: number) {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${sym}${amount}`;
}

export default function ResaleSellClient({
  publicId,
  content,
  providers,
  initialSessionId,
}: {
  publicId: string;
  content: ConsumerPassportContent;
  providers: ProviderSummary[];
  initialSessionId?: string;
}) {
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [valuation, setValuation] = useState<ResaleValuation | null>(content.resaleIntelligence || null);
  const [routes, setRoutes] = useState<ResaleRouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ResaleRouteOption | null>(null);
  const [condition, setCondition] = useState<string>("excellent");
  const [notes, setNotes] = useState("");
  const [flaws, setFlaws] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState("");
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

  const applySession = useCallback((data: SessionPayload) => {
    setSessionId(data.sessionId);
    setValuation(data.valuation);
    setRoutes(data.routes);
    if (data.listingDraft?.askingPrice) {
      setPrice(String(data.listingDraft.askingPrice));
    }
    const recommended = data.routes.find((r) => r.recommended) || data.routes[0] || null;
    setSelectedRoute(recommended);
  }, []);

  const loadSession = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/resale/sessions/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Session unavailable");
        return;
      }
      applySession({
        sessionId: data.sessionId,
        valuation: data.valuation,
        routes: data.routes,
        listingDraft: data.listingDraft,
      });
    },
    [applySession]
  );

  const createSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    const token = await ensureAuth(false);
    try {
      const res = await fetch("/api/resale/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ publicId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Could not start resale session");
        return;
      }
      applySession(data);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }, [applySession, publicId]);

  useEffect(() => {
    if (initialSessionId) {
      void loadSession(initialSessionId);
    }
  }, [initialSessionId, loadSession]);

  useEffect(() => {
    if (valuation && !price) {
      setPrice(String(valuation.estimatedValue));
    }
  }, [valuation, price]);

  async function ensureAuth(required: boolean): Promise<string | null> {
    if (accessToken) return accessToken;
    const stored = typeof window !== "undefined" ? localStorage.getItem("sb-access-token") : null;
    if (stored) {
      setAccessToken(stored);
      return stored;
    }
    if (required) {
      setError("Sign in to connect marketplaces and publish.");
    }
    return null;
  }

  function addPhotoUrl() {
    const url = window.prompt("Paste photo URL (consumer-uploaded image)");
    if (url?.trim()) setPhotos((p) => [...p, url.trim()]);
  }

  function routeNeedsMarketplace(kind: ResaleRouteKind) {
    return kind === "marketplace_listing";
  }

  async function submitListing() {
    setBusy(true);
    setError(null);
    const token = await ensureAuth(true);
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
          sessionId: sessionId || undefined,
          conditionGrade: condition,
          conditionNotes: notes || undefined,
          flaws: flaws || undefined,
          askingPrice: Number(price),
          currency: valuation?.currency || "USD",
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
        <h1 className="text-xl font-medium tracking-tight">Resale value</h1>
        <p className="text-xs text-[var(--pp-muted)] mt-1">
          {content.brand} · {content.productName}
        </p>

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

            {valuation ? (
              <div className="itx-resale-value-card">
                <p className="text-xs uppercase tracking-widest text-[var(--pp-muted)]">Estimated current value</p>
                <p className="text-3xl font-medium mt-1">
                  {money(valuation.currency, valuation.valueLow)}–{money(valuation.currency, valuation.valueHigh)}
                </p>
                <p className="text-sm text-[var(--pp-muted)] mt-2">
                  Midpoint {money(valuation.currency, valuation.estimatedValue)}
                  {valuation.valueRetentionPct != null ? ` · ${valuation.valueRetentionPct}% value retention` : ""}
                </p>
                <dl className="itx-resale-metrics mt-4 text-sm">
                  <div>
                    <dt>Market demand</dt>
                    <dd className="capitalize">{valuation.marketDemand}</dd>
                  </div>
                  <div>
                    <dt>Typical selling time</dt>
                    <dd>
                      {valuation.typicalSellingDaysMin}–{valuation.typicalSellingDaysMax} days
                    </dd>
                  </div>
                  <div>
                    <dt>Best channel</dt>
                    <dd>{valuation.bestChannel}</dd>
                  </div>
                </dl>
                <p className="text-[0.65rem] text-[var(--pp-muted)] mt-3">
                  Methodology: {valuation.methodology}. Comparable sold data will refine these estimates.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--pp-muted)]">Loading resale intelligence…</p>
            )}

            <button
              type="button"
              className="itx-resale-primary w-full"
              disabled={busy}
              onClick={async () => {
                if (!sessionId || !routes.length) {
                  await createSession();
                }
                setStep(1);
              }}
            >
              {busy ? "Preparing…" : "Compare resale routes"}
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-6 space-y-4">
            <h2 className="text-sm font-medium">Best resale route</h2>
            <p className="text-xs text-[var(--pp-muted)]">
              INTERTEXE compares instant sale, consignment, marketplace listing, and brand trade-in. You authorize
              your own marketplace account — the brand never sees your credentials.
            </p>
            <div className="space-y-2">
              {(routes.length ? routes : []).map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={`itx-resale-route-card w-full text-left ${selectedRoute?.id === route.id ? "selected" : ""}`}
                  onClick={() => setSelectedRoute(route)}
                >
                  <div className="flex justify-between gap-3 items-start">
                    <span>
                      <span className="font-medium text-sm block">{route.label}</span>
                      {route.recommended ? (
                        <span className="text-[0.6rem] uppercase tracking-wider text-[var(--pp-petrol)]">
                          Recommended
                        </span>
                      ) : null}
                    </span>
                    <span className="text-right shrink-0">
                      <span className="font-medium block">{route.youReceiveLabel}</span>
                      <span className="text-xs text-[var(--pp-muted)]">{route.speedLabel}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(0)}>
                Back
              </button>
              <button
                type="button"
                className="itx-resale-primary flex-1"
                disabled={!selectedRoute}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-6 space-y-4">
            <div className="itx-resale-listing-row text-sm">
              <p className="font-medium">Verified listing draft</p>
              <p className="text-xs text-[var(--pp-muted)] mt-1">
                {content.brand} {content.productName} · Passport verified
              </p>
              <ul className="mt-2 text-xs space-y-1 text-[var(--pp-muted)]">
                {content.composition ? <li>{content.composition}</li> : null}
                {content.manufacturingCountry ? <li>Made in {content.manufacturingCountry}</li> : null}
                {valuation?.originalRetail ? (
                  <li>Original retail {money(valuation.currency, valuation.originalRetail)}</li>
                ) : null}
              </ul>
            </div>
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
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="itx-resale-primary flex-1" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mt-6 space-y-4">
            <p className="text-sm">Add current photographs — retail photography may not be licensed for resale.</p>
            <button type="button" className="itx-resale-secondary w-full" onClick={addPhotoUrl}>
              + Add photo URL
            </button>
            {photos.length > 0 && (
              <ul className="text-xs space-y-1 break-all">
                {photos.map((p) => (
                  <li key={p} className="text-[var(--pp-muted)]">
                    {p}
                  </li>
                ))}
              </ul>
            )}
            <label className="block text-sm">
              Asking price ({valuation?.currency || "USD"})
              <input
                type="number"
                className="itx-resale-input w-full mt-1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={1}
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                type="button"
                className="itx-resale-primary flex-1"
                disabled={!photos.length || !price}
                onClick={() => setStep(4)}
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {step === 4 && !listings && selectedRoute && (
          <section className="mt-6 space-y-4">
            {!routeNeedsMarketplace(selectedRoute.routeKind) ? (
              <>
                <p className="text-sm">
                  <strong>{selectedRoute.label}</strong> — partner integration coming soon. INTERTEXE will send your
                  verified passport data to participating resale partners when APIs are wired.
                </p>
                <p className="text-xs text-[var(--pp-muted)]">
                  You selected {selectedRoute.youReceiveLabel} · {selectedRoute.speedLabel}. Switch to marketplace
                  listing to publish today.
                </p>
                <button type="button" className="itx-resale-secondary w-full" onClick={() => setStep(1)}>
                  Choose a different route
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Connect marketplace & publish</p>
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
                      </span>
                    </span>
                  </label>
                ))}
                <Link href="/resale/connections" className="text-xs underline text-[var(--pp-petrol)]">
                  Manage marketplace connections
                </Link>
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                <div className="flex gap-2">
                  <button type="button" className="itx-resale-secondary flex-1" onClick={() => setStep(3)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="itx-resale-primary flex-1"
                    disabled={busy || !selected.length}
                    onClick={submitListing}
                  >
                    {busy ? "Publishing…" : "Publish verified listing"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {listings && (
          <section className="mt-6 space-y-4">
            <h2 className="font-medium">Listing published</h2>
            <ul className="space-y-3">
              {listings.map((l) => (
                <li key={l.provider} className="itx-resale-listing-row">
                  <p className="font-medium capitalize">{l.provider}</p>
                  <p className="text-sm">{l.status === "handoff" ? "Continue on partner" : l.status}</p>
                  {l.externalUrl ? (
                    <a href={l.externalUrl} className="text-xs underline" target="_blank" rel="noreferrer">
                      View listing
                    </a>
                  ) : null}
                  {l.errorMessage ? <p className="text-xs text-red-700">{l.errorMessage}</p> : null}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--pp-muted)]">
              When sold, ownership transfers through INTERTEXE and the passport continues with the next owner.
            </p>
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
