"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HqCard } from "../../components/HqUi";

type IntegrationRow = {
  id: string;
  label: string;
  description: string;
  authMode: "oauth" | "api_key";
  appConfigured: boolean;
  missingEnv: string[];
  callbackUrl: string | null;
  connection: {
    status: string;
    accountLabel: string | null;
    expiresAt: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
  } | null;
};

export function IntegrationsClient({ canAdmin }: { canAdmin: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ascKeyId, setAscKeyId] = useState("");
  const [ascIssuerId, setAscIssuerId] = useState("");
  const [ascFile, setAscFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/integrations");
      const data = await res.json();
      setRows(data.integrations || []);
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
      setMessage(`${connected.replace(/_/g, " ")} connected. Nightly sync will keep data fresh.`);
      router.replace("/dashboard/settings", { scroll: false });
      void load();
    } else if (err) {
      setError(decodeURIComponent(err));
      router.replace("/dashboard/settings", { scroll: false });
    }
  }, [params, router]);

  async function disconnect(provider: string) {
    if (!canAdmin) return;
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
      setMessage("Disconnected.");
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
    setBusy(provider);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || data.message || "Sync failed");
      setMessage("Sync completed.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sync failed");
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
      setMessage("App Store Connect key saved. Tokens are minted automatically for nightly sync.");
      setAscFile(null);
      await load();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <HqCard title="Integrations" className="mb-6">
      <p className="text-sm text-black/55 mb-4 leading-relaxed">
        Connect Google, Meta/Instagram, TikTok, and Pinterest with one click — sign in on the provider site, approve
        access, and HQ stores encrypted tokens and refreshes them automatically. App Store Connect uses Apple’s API
        key (OAuth is not available for that API).
      </p>

      {message ? <p className="text-sm text-emerald-800 mb-3">{message}</p> : null}
      {error ? <p className="text-sm text-red-700 mb-3">{error}</p> : null}
      {loading ? <p className="text-sm text-black/45">Loading…</p> : null}

      <div className="divide-y divide-black/10">
        {rows.map((row) => {
          const connected = row.connection?.status === "connected" || row.connection?.status === "degraded";
          return (
            <div key={row.id} className="py-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-black/50 mt-1 leading-relaxed">{row.description}</p>
                {connected ? (
                  <p className="text-xs text-black/55 mt-2">
                    {row.connection?.accountLabel || "Connected"}
                    {row.connection?.lastSyncAt
                      ? ` · Last sync ${new Date(row.connection.lastSyncAt).toUTCString()}`
                      : ""}
                    {row.connection?.lastSyncError ? ` · ${row.connection.lastSyncError}` : ""}
                  </p>
                ) : !row.appConfigured && row.authMode === "oauth" ? (
                  <p className="text-xs text-amber-800 mt-2">
                    App registration pending — set {row.missingEnv.join(", ")} in Vercel, then Connect will work.
                    {row.callbackUrl ? ` Redirect URI: ${row.callbackUrl}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] tracking-[0.12em] uppercase border px-2 py-1 ${
                    connected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-black/10 text-black/50"
                  }`}
                >
                  {connected ? row.connection?.status || "connected" : "Not connected"}
                </span>

                {row.authMode === "oauth" ? (
                  connected ? (
                    <>
                      <button
                        type="button"
                        disabled={!canAdmin || busy === row.id}
                        onClick={() => void syncNow(row.id)}
                        className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                      >
                        Sync now
                      </button>
                      <button
                        type="button"
                        disabled={!canAdmin || busy === row.id}
                        onClick={() => void disconnect(row.id)}
                        className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <a
                      href={row.appConfigured ? `/api/dashboard/integrations/${row.id}/connect` : undefined}
                      aria-disabled={!row.appConfigured || !canAdmin}
                      className={`text-xs tracking-widest uppercase px-3 py-2 ${
                        row.appConfigured && canAdmin
                          ? "bg-black text-white hover:bg-black/85"
                          : "bg-black/20 text-white cursor-not-allowed pointer-events-none"
                      }`}
                    >
                      Connect
                    </a>
                  )
                ) : connected ? (
                  <>
                    <button
                      type="button"
                      disabled={!canAdmin || busy === row.id}
                      onClick={() => void syncNow(row.id)}
                      className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                    >
                      Sync now
                    </button>
                    <button
                      type="button"
                      disabled={!canAdmin || busy === row.id}
                      onClick={() => void disconnect(row.id)}
                      className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {canAdmin ? (
        <form onSubmit={uploadAsc} className="mt-6 border-t border-black/10 pt-5 space-y-3">
          <p className="text-xs tracking-[0.14em] uppercase text-black/45">App Store Connect API key</p>
          <p className="text-xs text-black/50 leading-relaxed">
            Create a key in App Store Connect → Users and Access → Integrations → App Store Connect API. Upload the
            .p8 once — HQ encrypts it and mints short-lived JWTs for nightly sync.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              value={ascKeyId}
              onChange={(e) => setAscKeyId(e.target.value)}
              placeholder="Key ID"
              className="border border-black/15 rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              value={ascIssuerId}
              onChange={(e) => setAscIssuerId(e.target.value)}
              placeholder="Issuer ID"
              className="border border-black/15 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <input
            required
            type="file"
            accept=".p8,text/plain"
            onChange={(e) => setAscFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          <button
            type="submit"
            disabled={busy === "app_store_connect"}
            className="bg-black text-white text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg disabled:opacity-60"
          >
            Save App Store Connect key
          </button>
        </form>
      ) : null}
    </HqCard>
  );
}
