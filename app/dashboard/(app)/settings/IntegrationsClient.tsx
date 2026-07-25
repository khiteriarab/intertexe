"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HqCard } from "../../components/HqUi";

type ConnectionInfo = {
  status: string;
  accountLabel: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastSyncLabel: string;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
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
  displayStatus: "connected" | "not_connected" | "needs_reconnect" | "sync_error" | string;
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
  const [ascFile, setAscFile] = useState<File | null>(null);
  const [showAscForm, setShowAscForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/integrations");
      const data = await res.json();
      setCards(data.cards || []);
    } catch {
      setError("Could not load integrations");
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
      });
      const data = await res.json();
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
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.message || "Sync failed — try Reconnect if access was revoked");
      }
      setMessage("Sync completed.");
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
    if (!canAdmin || !ascFile) return;
    setBusy("app_store_connect");
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("keyId", ascKeyId);
      fd.set("issuerId", ascIssuerId);
      fd.set("p8", ascFile);
      const res = await fetch("/api/dashboard/integrations/app-store-connect", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setMessage("App Store Connect key saved and encrypted.");
      setAscFile(null);
      setShowAscForm(false);
      await load();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
          Connect each provider with OAuth (or an App Store Connect API key). HQ encrypts tokens, refreshes them
          automatically, and pulls data nightly at 06:00 UTC. Use <span className="font-medium">Sync Now</span> while
          testing.
        </p>

        {message ? <p className="text-sm text-emerald-800 mb-3">{message}</p> : null}
        {error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}
        {loading ? <p className="text-sm text-black/45 mb-3">Loading…</p> : null}

        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const linked = Boolean(card.connection);
            const showAscUpload =
              card.providerId === "app_store_connect" && (!linked || showAscForm);
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
                  </p>
                  {card.connection?.accountLabel ? (
                    <p>
                      <span className="text-black/40">Account:</span> {card.connection.accountLabel}
                    </p>
                  ) : null}
                  {card.connection?.lastSyncError ? (
                    <p className="text-red-700 leading-relaxed">
                      Sync error: {card.connection.lastSyncError}
                    </p>
                  ) : null}
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
                          {card.needsReconnect ? "Reconnect" : "Connect"}
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
                            onClick={() => setShowAscForm(true)}
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
                          onClick={() => setShowAscForm(true)}
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
                      required
                      type="file"
                      accept=".p8,text/plain"
                      onChange={(e) => setAscFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs"
                    />
                    <button
                      type="submit"
                      disabled={busy === "app_store_connect"}
                      className="bg-black text-white text-xs tracking-widest uppercase px-3 py-2 rounded-lg disabled:opacity-60"
                    >
                      Save key
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
