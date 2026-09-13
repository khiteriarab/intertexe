"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ActivatedPlan = "professional" | "platform";

export function EntPostPaymentSync({
  slug,
  activated,
  initialPlan,
}: {
  slug: string;
  activated: ActivatedPlan;
  initialPlan: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"syncing" | "synced" | "timeout">("syncing");
  const [plan, setPlan] = useState(initialPlan);

  useEffect(() => {
    if (plan === activated) {
      setStatus("synced");
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;
    const interval = window.setInterval(async () => {
      attempts += 1;
      const res = await fetch(`/api/dashboard/org/${slug}/billing`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.plan === activated || data.plan === "saas" && activated === "professional")) {
        setPlan(String(data.plan));
        setStatus("synced");
        router.refresh();
        window.clearInterval(interval);
        return;
      }
      if (attempts >= maxAttempts) {
        setStatus("timeout");
        window.clearInterval(interval);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [activated, plan, router, slug]);

  if (status === "synced" || plan === activated) return null;

  return (
    <p className="text-sm text-[var(--ent-muted)] mb-6">
      {status === "syncing"
        ? "Confirming your subscription — this usually takes a few seconds…"
        : "Payment received. If your plan has not updated yet, refresh in a moment or open Billing."}
    </p>
  );
}
