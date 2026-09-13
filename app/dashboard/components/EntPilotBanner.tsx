import Link from "next/link";
import { PILOT_PRODUCT_LIMIT, planDisplayName } from "../../../lib/enterprise/pricing";
import { entLinkClass } from "./EnterpriseUi";

export function EntPilotBanner({
  base,
  plan,
  productCount,
  processedCount,
}: {
  base: string;
  plan: string;
  productCount: number;
  processedCount: number;
}) {
  const limit = PILOT_PRODUCT_LIMIT;
  const atLimit = productCount >= limit;

  return (
    <div className="ent-pilot-banner mb-6 md:mb-8">
      <div className="ent-pilot-banner-inner">
        <div className="min-w-0 flex-1">
          <p className="ent-pilot-banner-kicker">Pilot workspace</p>
          <p className="ent-pilot-banner-title">
            {processedCount} of {limit} products processed
          </p>
          <p className="ent-pilot-banner-copy">
            {atLimit
              ? "You’ve reached the pilot limit. Upgrade to import and manage your full catalog."
              : "Experience INTERTEXE on your real products — pricing appears when you’re ready to continue."}
          </p>
          <p className="text-[11px] text-[var(--ent-muted-light)] mt-2">
            {planDisplayName(plan)} · {productCount} active in workspace
          </p>
        </div>
        <Link href={`${base}/upgrade`} className={`${entLinkClass} ent-pilot-banner-cta shrink-0`}>
          {atLimit ? "Upgrade now" : "Upgrade to continue →"}
        </Link>
      </div>
      <div className="ent-pilot-banner-meter" aria-hidden>
        <span
          className="ent-pilot-banner-meter-fill"
          style={{ width: `${Math.min(100, (processedCount / limit) * 100)}%` }}
        />
      </div>
    </div>
  );
}
