import { requireHqSession } from "../../../../lib/dashboard/auth";
import { fetchHqConsumerRows, formatCount } from "../../../../lib/dashboard/metrics";
import { HqCard, HqEmptyState, HqPageHeader } from "../../components/HqUi";

export const metadata = { title: "Consumers" };
export const dynamic = "force-dynamic";

export default async function HqConsumersPage() {
  await requireHqSession();
  const { rows, error } = await fetchHqConsumerRows(50);

  return (
    <div>
      <HqPageHeader
        title="Consumers"
        description="People behind the scans — preferences, activity, and engagement stubs. Full profiles + CSV export expand next."
      />

      <HqCard className="mb-4">
        <p className="text-[10px] tracking-[0.14em] uppercase text-black/40 mb-2">Scope</p>
        <p className="text-sm text-black/70 leading-relaxed">
          Users · Retention · Membership · Favorites · Collections · Outfit boards · Material preferences · Segments ·
          Acquisition
        </p>
      </HqCard>

      {error ? (
        <HqEmptyState title="Could not load consumers" body={error} />
      ) : rows.length === 0 ? (
        <HqEmptyState
          title="No consumer preference rows yet"
          body="Lists users from user_preferences, then overlays scan and favorite counts. As accounts sync, this table fills."
        />
      ) : (
        <HqCard>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-black/40">
                <tr>
                  <th className="py-2 pr-3 font-medium">User ID</th>
                  <th className="py-2 pr-3 font-medium">Country</th>
                  <th className="py-2 pr-3 font-medium">Scans</th>
                  <th className="py-2 pr-3 font-medium">Favorites</th>
                  <th className="py-2 font-medium">Last scan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-t border-black/5">
                    <td className="py-2 pr-3 font-mono text-xs max-w-[180px] truncate">{row.userId}</td>
                    <td className="py-2 pr-3 uppercase text-black/60">{row.country || "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCount(row.scans)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatCount(row.favorites)}</td>
                    <td className="py-2 text-black/55 whitespace-nowrap">
                      {row.lastScanAt ? new Date(row.lastScanAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HqCard>
      )}
    </div>
  );
}
