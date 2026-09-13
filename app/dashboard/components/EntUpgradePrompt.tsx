import Link from "next/link";
import { orgUpgradeUrl } from "../../../lib/enterprise/org-routes";
import { upgradeHintForPlan } from "../../../lib/enterprise/pricing";
import { entButtonClass } from "./EnterpriseUi";

export function EntUpgradePrompt({
  slug,
  plan,
  title,
  body,
  feature,
}: {
  slug: string;
  plan: string;
  title: string;
  body?: string;
  feature?: string;
}) {
  return (
    <div className="ent-panel-nested p-6 md:p-8 border border-[var(--ent-border)]">
      <p className="ent-section-eyebrow">{feature ? `${feature} · Platform` : "Upgrade required"}</p>
      <h2 className="ent-serif text-xl text-[var(--ent-ink)] mt-2">{title}</h2>
      <p className="text-sm text-[var(--ent-muted)] mt-3 max-w-xl leading-relaxed">
        {body || upgradeHintForPlan(plan)}
      </p>
      <Link href={orgUpgradeUrl(slug)} className={`${entButtonClass} inline-flex mt-6`}>
        View plans & upgrade
      </Link>
    </div>
  );
}
