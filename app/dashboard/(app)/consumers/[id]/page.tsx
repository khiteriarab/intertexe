import Link from "next/link";
import { notFound } from "next/navigation";
import { requireHqSession } from "../../../../../lib/dashboard/auth";
import { fetchHqConsumerProfile } from "../../../../../lib/dashboard/acquisition";
import { formatCount } from "../../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqMetricGrid, HqPageHeader } from "../../../components/HqUi";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Consumer ${id.slice(0, 8)}` };
}

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default async function HqConsumerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHqSession();
  const { id } = await params;
  const profile = await fetchHqConsumerProfile(id);

  if (profile.error === "consumer_not_found") notFound();

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null;

  return (
    <div>
      <HqPageHeader
        title={name || profile.email || "Consumer"}
        description="Immutable first-touch acquisition plus chronological journey. Later visits stay in the event stream — original source is never overwritten."
        action={
          <Link
            href="/dashboard/consumers"
            className="text-xs tracking-widest uppercase border border-black/15 px-3 py-2 hover:bg-black hover:text-white"
          >
            All consumers
          </Link>
        }
      />

      {profile.error ? <HqEmptyState title="Could not load profile" body={profile.error} /> : null}

      <HqMetricGrid
        items={[
          { label: "Acquisition", value: profile.acquisitionSource },
          { label: "Scans", value: formatCount(profile.counts.scans) },
          { label: "Favorites", value: formatCount(profile.counts.favorites) },
          {
            label: "Attributed sales",
            value: profile.counts.purchases ? money(profile.revenue.sales) : "—",
            hint: profile.counts.purchases
              ? `${formatCount(profile.counts.purchases)} tx · ${money(profile.revenue.commission)} commission`
              : "Requires Rakuten u1 = user id",
          },
        ]}
      />

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <HqCard title="First-touch (immutable)">
          <dl className="space-y-2 text-sm">
            {[
              ["Source", profile.firstTouch.source || "Unknown"],
              ["Medium", profile.firstTouch.medium || "—"],
              ["Campaign", profile.firstTouch.campaign || "—"],
              ["Content / influencer", profile.firstTouch.content || "—"],
              ["Term", profile.firstTouch.term || "—"],
              ["Landing page", profile.firstTouch.landingPage || "—"],
              ["Referrer", profile.firstTouch.referrer || "—"],
              ["Session", profile.firstTouch.sessionId || "—"],
              ["GA client ID", profile.firstTouch.gaClientId || "—"],
              ["gclid", profile.firstTouch.gclid || "—"],
              ["ttclid", profile.firstTouch.ttclid || "—"],
              ["fbclid", profile.firstTouch.fbclid || "—"],
              ["msclkid", profile.firstTouch.msclkid || "—"],
              ["Platform", profile.firstTouch.platform || "—"],
              [
                "Captured at",
                profile.firstTouch.at ? new Date(profile.firstTouch.at).toLocaleString() : "—",
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 justify-between border-b border-black/5 pb-2">
                <dt className="text-black/45 shrink-0">{k}</dt>
                <dd className="text-right font-mono text-xs break-all">{v}</dd>
              </div>
            ))}
          </dl>
          {!profile.firstTouch.source && !profile.firstTouch.landingPage ? (
            <p className="mt-4 text-xs text-black/50">
              Existing users without first-touch data are marked Unknown — we do not fabricate attribution.
            </p>
          ) : null}
        </HqCard>

        <HqCard title="Customer journey">
          <ol className="relative space-y-0">
            {profile.timeline.map((step, i) => (
              <li key={step.key} className="flex gap-3 pb-5 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                      step.status === "done"
                        ? "bg-black"
                        : step.status === "unknown"
                          ? "bg-black/25"
                          : "border border-black/30 bg-white"
                    }`}
                  />
                  {i < profile.timeline.length - 1 ? (
                    <span className="w-px flex-1 bg-black/10 mt-1" />
                  ) : null}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-sm font-medium capitalize">{step.label}</p>
                  {step.detail ? (
                    <p className="text-xs text-black/55 mt-0.5 break-words">{step.detail}</p>
                  ) : null}
                  <p className="text-[11px] text-black/40 mt-1 tabular-nums">
                    {step.at ? new Date(step.at).toLocaleString() : step.status === "pending" ? "Not yet" : "Unknown"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[11px] text-black/40 leading-relaxed">
            Journey shape: Source → Landing → Registration → First scan → First favorite → Affiliate click →
            Purchase
          </p>
        </HqCard>
      </div>

      <HqCard className="mt-4" title="Identity">
        <p className="font-mono text-xs break-all text-black/70">{profile.userId}</p>
        {profile.email ? <p className="text-sm mt-2 text-black/60">{profile.email}</p> : null}
        {profile.registeredAt ? (
          <p className="text-xs text-black/45 mt-2">
            Registered {new Date(profile.registeredAt).toLocaleString()}
          </p>
        ) : null}
      </HqCard>
    </div>
  );
}
