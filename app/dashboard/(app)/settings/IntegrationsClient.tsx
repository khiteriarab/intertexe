"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HqCard } from "../../components/HqUi";
import {
  CHROME_WEB_STORE_DEV_CONSOLE_URL,
  CHROME_WEB_STORE_ITEM_ID,
  chromeWebStoreDetailUrl,
} from "../../../../lib/chrome-extension";

type ConnectionInfo = {
  status: string;
  accountLabel: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastSyncLabel: string;
  lastSuccessfulSyncAt?: string | null;
  lastSuccessfulSyncLabel?: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  listingId?: string | null;
  weeklyUsers?: number | null;
  weeklyInstalls?: number | null;
};

type IntegrationCard = {
  cardId: string;
  label: string;
  blurb: string;
  permissions: string[];
  providerId: string;
  authMode: "oauth" | "api_key";
  appConfigured: boolean;
  missingEnv: string[];
  callbackUrl: string | null;
  needsReconnect: boolean;
  setupHints?: string[];
  displayStatus: "connected" | "not_connected" | "needs_reconnect" | "sync_error" | "setup_warning" | string;
  connection: ConnectionInfo | null;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase border border-emerald-200 bg-emerald-50 text-emerald-900 px-2 py-1">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Connected
      </span>
    );
  }
  if (status === "setup_warning") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase border border-amber-200 bg-amber-50 text-amber-950 px-2 py-1">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        Setup needed
      </span>
    );
  }
  if (status === "needs_reconnect") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase border border-amber-200 bg-amber-50 text-amber-950 px-2 py-1">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        Reconnect required
      </span>
    );
  }
  if (status === "sync_error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase border border-red-200 bg-red-50 text-red-900 px-2 py-1">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-600" />
        Sync error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase border border-black/10 text-black/50 px-2 py-1">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Not connected
    </span>
  );
}

function connectLabel(providerId: string, needsReconnect: boolean): string {
  if (providerId === "tiktok" && !needsReconnect) return "Continue with TikTok";
  return needsReconnect ? "Reconnect" : "Connect";
}

export function IntegrationsClient({ canAdmin }: { canAdmin: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [cards, setCards] = useState<IntegrationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ascKeyId, setAscKeyId] = useState("");
  const [ascIssuerId, setAscIssuerId] = useState("");
  const [ascVendorNumber, setAscVendorNumber] = useState("");
  const [ascFile, setAscFile] = useState<File | null>(null);
  const [ascPem, setAscPem] = useState("");
  const [showAscForm, setShowAscForm] = useState(false);
  const [showChromeForm, setShowChromeForm] = useState(false);
  const [chromeListingId, setChromeListingId] = useState(CHROME_WEB_STORE_ITEM_ID);
  const [chromeWeeklyUsers, setChromeWeeklyUsers] = useState("");
  const [chromeWeeklyInstalls, setChromeWeeklyInstalls] = useState("");
  const ascFileRef = useRef<HTMLInputElement | null>(null);

  async function readJson(res: Response) {
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (!contentType.includes("application/json")) {
      const prefix = text.slice(0, 200).replace(/\s+/g, " ").trim();
      throw new Error(
        `Expected JSON from ${res.url || "integrations API"} but got HTTP ${res.status} (${contentType || "unknown"}). Body starts: ${prefix}`
      );
    }
    return text ? JSON.parse(text) : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/integrations", { redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — refresh and sign in again, then reopen Integrations.");
      }
      const data = await readJson(res);
      const nextCards: IntegrationCard[] = data.cards || [];
      setCards(nextCards);
      const chrome = nextCards.find((card) => card.providerId === "chrome_web_store");
      if (chrome?.connection?.listingId) setChromeListingId(chrome.connection.listingId);
      if (chrome?.connection?.weeklyUsers != null) {
        setChromeWeeklyUsers(String(chrome.connection.weeklyUsers));
      }
      if (chrome?.connection?.weeklyInstalls != null) {
        setChromeWeeklyInstalls(String(chrome.connection.weeklyInstalls));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const connected = params.get("integration_connected");
    const err = params.get("integration_error");
    if (connected) {
      setMessage(`${connected.replace(/_/g, " ")} connected. Nightly sync keeps data fresh — use Sync Now anytime.`);
      router.replace("/dashboard/settings", { scroll: false });
      void load();
    } else if (err) {
      setError(decodeURIComponent(err));
      router.replace("/dashboard/settings", { scroll: false });
    }
  }, [params, router]);

  async function disconnect(provider: string) {
    if (!canAdmin) return;
    if (!confirm("Disconnect this integration and delete stored tokens from HQ?")) return;
    setBusy(provider);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — sign in again, then retry.");
      }
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || "Disconnect failed");
      setMessage("Disconnected — stored tokens removed.");
      await load();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  }

  async function syncNow(provider: string) {
    if (!canAdmin) return;
    setBusy(`sync:${provider}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — sign in again, then retry Sync Now.");
      }
      const data = await readJson(res);
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.message || "Sync failed — try Reconnect if access was revoked");
      }
      const warnings = Array.isArray(data.setupWarnings)
        ? data.setupWarnings
        : Array.isArray(data.metrics?.setupWarnings)
          ? data.metrics.setupWarnings
          : [];
      setMessage(
        warnings.length
          ? `Sync completed with setup notes: ${warnings.join(" · ")}`
          : "Sync completed."
      );
      await load();
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sync failed");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function uploadAsc(e: FormEvent) {
    e.preventDefault();
    if (!canAdmin) return;
    const pemFromPaste = ascPem.trim();
    const hasPem = Boolean(ascFile) || pemFromPaste.includes("PRIVATE KEY");
    if (!hasPem) {
      setError("Choose the .p8 file, or paste its contents into the box below.");
      return;
    }
    setBusy("app_store_connect");
    setError(null);
    setMessage(null);
    try {
      let res: Response;
      if (ascFile) {
        const fd = new FormData();
        fd.set("keyId", ascKeyId);
        fd.set("issuerId", ascIssuerId);
        if (ascVendorNumber.trim()) fd.set("vendorNumber", ascVendorNumber.trim());
        fd.set("p8", ascFile);
        res = await fetch("/api/dashboard/integrations/app-store-connect", {
          method: "POST",
          body: fd,
          redirect: "manual",
        });
      } else {
        res = await fetch("/api/dashboard/integrations/app-store-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyId: ascKeyId,
            issuerId: ascIssuerId,
            vendorNumber: ascVendorNumber.trim() || undefined,
            privateKeyPem: pemFromPaste,
          }),
          redirect: "manual",
        });
      }
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — sign in again, then retry.");
      }
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setMessage("App Store Connect key saved and encrypted.");
      setAscFile(null);
      setAscPem("");
      setShowAscForm(false);
      await load();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveChromeListing(e: FormEvent) {
    e.preventDefault();
    if (!canAdmin) return;
    setBusy("chrome_web_store");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/integrations/chrome-web-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: chromeListingId.trim() || CHROME_WEB_STORE_ITEM_ID,
          weeklyUsers: chromeWeeklyUsers.trim() || undefined,
          weeklyInstalls: chromeWeeklyInstalls.trim() || undefined,
        }),
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        throw new Error("Session expired — sign in again, then retry.");
      }
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || "Could not save Chrome Web Store listing");
      setMessage("Chrome Web Store listing connected. First-party saves will snapshot on Sync Now.");
      setShowChromeForm(false);
      await load();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save listing");
    } finally {
      setBusy(null);
    }
  }

  // Deduplicate ASC form — only once under App Store Connect card.
  const renderedProviders = new Set<string>();

  return (
    <div className="mb-6">
      <HqCard title="Integrations">
        <p className="text-sm text-black/55 mb-5 leading-relaxed">
          Connect each provider with OAuth, an App Store Connect API key, or a Chrome Web Store listing. HQ encrypts
          tokens, refreshes them automatically, and pulls data nightly at 06:00 UTC. Use{" "}
          <span className="font-medium">Sync Now</span> while testing.
        </p>

        {message ? <p className="text-sm text-emerald-800 mb-3">{message}</p> : null}
        {error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}
        {loading ? <p className="text-sm text-black/45 mb-3">Loading…</p> : null}

        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const linked = Boolean(card.connection);
            const showAscUpload =
              card.providerId === "app_store_connect" && (!linked || showAscForm);
            const showChromeConnect =
              card.providerId === "chrome_web_store" && (!linked || showChromeForm);
            const firstOfProvider = !renderedProviders.has(card.providerId);
            if (firstOfProvider) renderedProviders.add(card.providerId);

            return (
              <div
                key={card.cardId}
                className="border border-black/10 rounded-xl p-4 flex flex-col gap-3 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{card.label}</p>
                    <p className="text-xs text-black/50 mt-1 leading-relaxed">{card.blurb}</p>
                  </div>
                  <StatusBadge status={card.displayStatus} />
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-1">Data accessed</p>
                  <p className="text-xs text-black/65 leading-relaxed">{card.permissions.join(" · ")}</p>
                </div>

                <div className="text-xs text-black/55 space-y-1">
                  <p>
                    <span className="text-black/40">Last sync:</span>{" "}
                    {card.connection?.lastSyncLabel || "Never"}
                    {card.connection?.lastSyncStatus ? (
                      <span className="text-black/35">
                        {" "}
                        ({card.connection.lastSyncStatus === "success"
                          ? "ok"
                          : card.connection.lastSyncStatus === "warning"
                            ? "warning"
                            : card.connection.lastSyncStatus === "error"
                              ? "failed"
                              : card.connection.lastSyncStatus}
                        )
                      </span>
                    ) : null}
                  </p>
                  {card.connection?.lastSuccessfulSyncLabel &&
                  card.connection.lastSuccessfulSyncLabel !== "Never" ? (
                    <p>
                      <span className="text-black/40">Last successful sync:</span>{" "}
                      {card.connection.lastSuccessfulSyncLabel}
                    </p>
                  ) : linked ? (
                    <p className="text-black/40">Last successful sync: not yet recorded</p>
                  ) : null}
                  {card.connection?.accountLabel ? (
                    <p>
                      <span className="text-black/40">Account:</span> {card.connection.accountLabel}
                    </p>
                  ) : null}
                  {card.connection?.lastSyncStatus === "error" && card.connection.lastSyncError ? (
                    <p className="text-red-700 leading-relaxed">
                      Sync failed: {card.connection.lastSyncError}
                    </p>
                  ) : null}
                  {card.connection?.lastSyncStatus === "warning" && card.connection.lastSyncError ? (
                    <p className="text-amber-900 leading-relaxed">
                      Sync warning: {card.connection.lastSyncError}
                    </p>
                  ) : null}
                  {(card.setupHints || []).map((hint) => (
                    <p key={hint} className="text-amber-900 leading-relaxed">
                      {hint}
                    </p>
                  ))}
                  {!card.appConfigured && card.authMode === "oauth" ? (
                    <p className="text-amber-900 leading-relaxed">
                      App credentials missing ({card.missingEnv.join(", ")}). Add them in Vercel, then Connect.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mt-auto pt-1">
                  {card.authMode === "oauth" ? (
                    <>
                      {!linked || card.needsReconnect ? (
                        <a
                          href={
                            card.appConfigured && canAdmin
                              ? `/api/dashboard/integrations/${card.providerId}/connect`
                              : undefined
                          }
                          className={`text-xs tracking-widest uppercase px-3 py-2 ${
                            card.appConfigured && canAdmin
                              ? "bg-black text-white hover:bg-black/85"
                              : "bg-black/20 text-white pointer-events-none"
                          }`}
                        >
                          {connectLabel(card.providerId, card.needsReconnect)}
                        </a>
                      ) : null}
                      {linked && !card.needsReconnect ? (
                        <button
                          type="button"
                          disabled={!canAdmin || busy === `sync:${card.providerId}`}
                          onClick={() => void syncNow(card.providerId)}
                          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          {busy === `sync:${card.providerId}` ? "Syncing…" : "Sync Now"}
                        </button>
                      ) : null}
                      {linked && card.needsReconnect ? (
                        <button
                          type="button"
                          disabled={!canAdmin || busy === `sync:${card.providerId}`}
                          onClick={() => void syncNow(card.providerId)}
                          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          Retry sync
                        </button>
                      ) : null}
                      {linked && firstOfProvider ? (
                        <button
                          type="button"
                          disabled={!canAdmin || busy === card.providerId}
                          onClick={() => void disconnect(card.providerId)}
                          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {linked && !card.needsReconnect ? (
                        <button
                          type="button"
                          disabled={!canAdmin || busy === `sync:${card.providerId}`}
                          onClick={() => void syncNow(card.providerId)}
                          className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          {busy === `sync:${card.providerId}` ? "Syncing…" : "Sync Now"}
                        </button>
                      ) : null}
                      {linked ? (
                        <>
                          <button
                            type="button"
                            disabled={!canAdmin}
                            onClick={() =>
                              card.providerId === "chrome_web_store"
                                ? setShowChromeForm(true)
                                : setShowAscForm(true)
                            }
                            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                          >
                            Reconnect
                          </button>
                          <button
                            type="button"
                            disabled={!canAdmin || busy === card.providerId}
                            onClick={() => void disconnect(card.providerId)}
                            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAdmin}
                          onClick={() =>
                            card.providerId === "chrome_web_store"
                              ? setShowChromeForm(true)
                              : setShowAscForm(true)
                          }
                          className="text-xs tracking-widest uppercase bg-black text-white px-3 py-2 disabled:opacity-50"
                        >
                          Connect
                        </button>
                      )}
                    </>
                  )}
                </div>

                {showAscUpload && canAdmin ? (
                  <form onSubmit={uploadAsc} className="border-t border-black/10 pt-3 space-y-2">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">Upload .p8 API key</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        required
                        value={ascKeyId}
                        onChange={(e) => setAscKeyId(e.target.value)}
                        placeholder="Key ID"
                        className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        required
                        value={ascIssuerId}
                        onChange={(e) => setAscIssuerId(e.target.value)}
                        placeholder="Issuer ID"
                        className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <input
                      value={ascVendorNumber}
                      onChange={(e) => setAscVendorNumber(e.target.value)}
                      placeholder="Vendor Number (for downloads)"
                      className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <p className="text-[11px] text-black/45 leading-relaxed">
                      Vendor Number is a short account ID in App Store Connect → Payments and Financial Reports (top of
                      the page). Required for downloads. Not the Key ID or Issuer ID.
                    </p>
                    <div className="space-y-2">
                      <input
                        ref={ascFileRef}
                        type="file"
                        accept=".p8,text/plain,.pem"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAscFile(file);
                          if (file) setAscPem("");
                        }}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={() => ascFileRef.current?.click()}
                        className="w-full text-left text-xs border border-black/15 rounded-lg px-3 py-2 hover:bg-black/[0.03]"
                      >
                        {ascFile ? `Selected: ${ascFile.name}` : "Choose .p8 file"}
                      </button>
                      <p className="text-[11px] text-black/45">Or paste the .p8 contents (keeps the key in your browser only):</p>
                      <textarea
                        value={ascPem}
                        onChange={(e) => {
                          setAscPem(e.target.value);
                          if (e.target.value.trim()) setAscFile(null);
                        }}
                        rows={5}
                        spellCheck={false}
                        placeholder={"-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"}
                        className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-xs font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy === "app_store_connect"}
                      className="bg-black text-white text-xs tracking-widest uppercase px-3 py-2 rounded-lg disabled:opacity-60"
                    >
                      Save key
                    </button>
                  </form>
                ) : null}

                {showChromeConnect && canAdmin ? (
                  <form onSubmit={saveChromeListing} className="border-t border-black/10 pt-3 space-y-2">
                    <p className="text-[10px] tracking-[0.14em] uppercase text-black/45">Connect listing</p>
                    <input
                      required
                      value={chromeListingId}
                      onChange={(e) => setChromeListingId(e.target.value)}
                      placeholder="Chrome Web Store item ID"
                      className="w-full border border-black/15 rounded-lg px-2 py-1.5 text-sm font-mono"
                    />
                    <p className="text-[11px] text-black/45 leading-relaxed">
                      Live listing:{" "}
                      <a
                        href={chromeWebStoreDetailUrl(chromeListingId || CHROME_WEB_STORE_ITEM_ID)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Chrome Web Store
                      </a>
                      {" · "}
                      <a
                        href={CHROME_WEB_STORE_DEV_CONSOLE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        Publisher dashboard
                      </a>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={chromeWeeklyUsers}
                        onChange={(e) => setChromeWeeklyUsers(e.target.value)}
                        placeholder="Weekly users (optional)"
                        inputMode="numeric"
                        className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        value={chromeWeeklyInstalls}
                        onChange={(e) => setChromeWeeklyInstalls(e.target.value)}
                        placeholder="Weekly installs (optional)"
                        inputMode="numeric"
                        className="border border-black/15 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-black/45 leading-relaxed">
                      Google does not offer an installs API. First-party saves sync automatically. Weekly users and
                      installs are copied from the publisher dashboard — not from website clicks.
                    </p>
                    <button
                      type="submit"
                      disabled={busy === "chrome_web_store"}
                      className="bg-black text-white text-xs tracking-widest uppercase px-3 py-2 rounded-lg disabled:opacity-60"
                    >
                      {busy === "chrome_web_store" ? "Saving…" : "Save listing"}
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      </HqCard>
    </div>
  );
}
