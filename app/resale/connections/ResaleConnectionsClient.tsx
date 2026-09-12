"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketplaceProvider } from "../../../lib/resale/types";

type Connection = {
  provider: MarketplaceProvider;
  status: string;
  external_account_label?: string | null;
};

type ProviderSummary = {
  id: MarketplaceProvider;
  displayName: string;
  integrationStatus: string;
};

export default function ResaleConnectionsClient({
  providers,
}: {
  providers: ProviderSummary[];
}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("sb-access-token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/resale/connections", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch(() => {});
  }, [token]);

  async function connect(provider: MarketplaceProvider) {
    if (!token) {
      setMessage("Sign in to connect marketplaces.");
      return;
    }
    const res = await fetch("/api/resale/connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
      return;
    }
    setMessage(data.message || data.status);
  }

  async function disconnect(provider: MarketplaceProvider) {
    if (!token) return;
    await fetch("/api/resale/connections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider, action: "disconnect" }),
    });
    setConnections((c) => c.filter((x) => x.provider !== provider));
  }

  function statusFor(id: MarketplaceProvider) {
    const conn = connections.find((c) => c.provider === id);
    const meta = providers.find((p) => p.id === id);
    if (meta?.integrationStatus === "handoff") return "Handoff only";
    if (meta?.integrationStatus === "requires_partner_access") return "Integration access required";
    if (conn?.status === "connected") return `Connected as ${conn.external_account_label || "seller"}`;
    return "Not connected";
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1a1f22]">
      <div className="max-w-md mx-auto px-4 py-8">
        <p className="text-[10px] tracking-[0.22em] uppercase text-black/45">INTERTEXE</p>
        <h1 className="text-2xl font-medium mt-2">Connected marketplaces</h1>
        <p className="text-sm text-black/55 mt-2">
          Capability differences are shown honestly. Poshmark uses listing package handoff until approved API access exists.
        </p>

        <ul className="mt-8 space-y-4">
          {providers.map((p) => (
            <li key={p.id} className="rounded-xl border border-black/10 bg-white/60 p-4">
              <p className="font-medium">{p.displayName}</p>
              <p className="text-xs text-black/50 mt-1">{statusFor(p.id)}</p>
              <div className="mt-3 flex gap-2">
                {p.integrationStatus === "live" ? (
                  <>
                    <button
                      type="button"
                      className="text-xs uppercase tracking-wider underline"
                      onClick={() => connect(p.id)}
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      className="text-xs uppercase tracking-wider text-black/40"
                      onClick={() => disconnect(p.id)}
                    >
                      Disconnect
                    </button>
                  </>
                ) : p.integrationStatus === "handoff" ? (
                  <span className="text-xs text-black/45">Learn more — handoff workflow</span>
                ) : (
                  <span className="text-xs text-black/45">Requires Vinted Pro allowlist</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {message ? <p className="text-sm mt-4 text-black/60">{message}</p> : null}

        <Link href="/" className="inline-block mt-8 text-xs tracking-widest uppercase underline">
          Home
        </Link>
      </div>
    </main>
  );
}
