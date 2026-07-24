import Link from "next/link";
import { requireHqSession } from "../../../../lib/dashboard/auth";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { HqCard, HqPageHeader } from "../../components/HqUi";
import { SettingsAdminClient } from "./SettingsAdminClient";

export const metadata = { title: "Settings" };

const FALLBACK_SOURCES = [
  { key: "supabase", label: "Supabase", status: "connected" },
  { key: "website", label: "INTERTEXE website", status: "connected" },
  { key: "ios_app", label: "iOS app", status: "connected" },
  { key: "rakuten_feed", label: "Rakuten product feed", status: "connected" },
  { key: "rakuten_revenue", label: "Rakuten revenue reports", status: "not_connected" },
  { key: "resend", label: "Resend email", status: "connected" },
  { key: "app_store_connect", label: "App Store Connect", status: "not_connected" },
  { key: "tiktok", label: "TikTok", status: "not_connected" },
  { key: "instagram", label: "Instagram", status: "not_connected" },
  { key: "pinterest", label: "Pinterest", status: "not_connected" },
  { key: "google_analytics", label: "Google Analytics", status: "not_connected" },
  { key: "search_console", label: "Search Console", status: "not_connected" },
];

function statusLabel(status: string) {
  if (status === "connected") return "Connected";
  if (status === "degraded") return "Degraded";
  if (status === "error") return "Error";
  return "Not connected";
}

export default async function HqSettingsPage() {
  const session = await requireHqSession();
  const supabase = getServerSupabase();
  const canAdmin = session.roles.some((r) => ["founder", "admin"].includes(r));

  let sources = FALLBACK_SOURCES;
  if (supabase) {
    const { data, error } = await supabase
      .from("hq_data_sources")
      .select("key, label, status")
      .eq("workspace_id", session.workspaceId)
      .order("label");
    if (!error && data?.length) sources = data;
  }

  return (
    <div>
      <HqPageHeader
        title="Settings"
        description="Workspace SaaS controls, team invites, platform API keys, data sources, and partnership CRM."
      />

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <HqCard title="Workspace">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Name</dt>
              <dd className="mt-1">{session.workspaceName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Slug</dt>
              <dd className="mt-1">{session.workspaceSlug}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Product hierarchy</dt>
              <dd className="mt-1 text-black/70 leading-relaxed">
                Website → acquisition · App → consumer product · Dashboard → internal OS · Platform → enterprise SaaS
              </dd>
            </div>
          </dl>
        </HqCard>

        <HqCard title="Operator">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Name</dt>
              <dd className="mt-1">{session.fullName || "Khiteriara Brown"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Email</dt>
              <dd className="mt-1">{session.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-black/45">Roles</dt>
              <dd className="mt-1">{session.roles.join(", ")}</dd>
            </div>
          </dl>
        </HqCard>
      </div>

      <SettingsAdminClient
        workspaceName={session.workspaceName}
        workspaceSlug={session.workspaceSlug}
        workspaces={session.workspaces.map((w) => ({ id: w.id, slug: w.slug, name: w.name }))}
        canAdmin={canAdmin}
      />

      <HqCard title="Data sources" className="mb-4 mt-6">
        <p className="text-sm text-black/55 mb-4">
          Honest status only. No fabricated integrations. Import Rakuten revenue under Commerce.
        </p>
        <div className="divide-y divide-black/10">
          {sources.map((row) => (
            <div key={row.key} className="flex items-center justify-between py-3 gap-4">
              <p className="text-sm">{row.label}</p>
              <span className="text-[10px] tracking-[0.12em] uppercase text-black/50">
                {statusLabel(row.status)}
              </span>
            </div>
          ))}
        </div>
      </HqCard>

      <HqCard title="Partnerships CRM">
        <p className="text-sm text-black/60 leading-relaxed mb-4">
          Brand, retailer, influencer, press, investor, and university pipelines. Nested under Settings so the Dashboard’s
          primary nav stays focused on material, brand, product, and DPP intelligence.
        </p>
        <Link
          href="/dashboard/partnerships"
          className="inline-block mt-4 text-xs tracking-widest uppercase underline underline-offset-4"
        >
          Open partnerships workspace →
        </Link>
      </HqCard>
    </div>
  );
}
