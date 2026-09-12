import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanKey } from "./entitlements";
import { recordBillingAudit, gracePeriodEnd } from "./billing-lifecycle";
import { normalizePlanKey, type BillingStatus } from "./plans";

export type PaddleEnvironment = "sandbox" | "production";

export type PaddlePlanMeta = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
  kind: "subscription" | "implementation";
};

export function getPaddleEnvironment(): PaddleEnvironment {
  const env = process.env.PADDLE_ENV || process.env.PADDLE_ENVIRONMENT;
  return env === "production" ? "production" : "sandbox";
}

export function getPaddleApiBase(): string {
  return getPaddleEnvironment() === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

export function isPaddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY?.trim());
}

/** Map Paddle price IDs → plan entitlements (env + optional JSON override). */
export function paddlePlanByPriceId(priceId: string): PaddlePlanMeta | null {
  const id = String(priceId || "").trim();
  if (!id) return null;

  const fromEnv: Array<[string | undefined, PaddlePlanMeta]> = [
    [
      process.env.PADDLE_PRICE_PLATFORM || process.env.PADDLE_PRICE_SAAS_PLATFORM,
      { plan: "platform", productAllowance: 500, passportAllowance: 500, kind: "subscription" },
    ],
    [
      process.env.PADDLE_PRICE_PROFESSIONAL || process.env.PADDLE_PRICE_SAAS_PROFESSIONAL,
      { plan: "professional", productAllowance: 5_000, passportAllowance: 5_000, kind: "subscription" },
    ],
    [
      process.env.PADDLE_PRICE_IMPLEMENTATION || process.env.PADDLE_PRICE_FOUNDING_PILOT,
      { plan: "founding_pilot", productAllowance: 500, passportAllowance: 100, kind: "implementation" },
    ],
    [
      process.env.PADDLE_PRICE_SAAS_STARTER,
      { plan: "platform", productAllowance: 500, passportAllowance: 500, kind: "subscription" },
    ],
    [
      process.env.PADDLE_PRICE_SAAS_GROWTH,
      { plan: "professional", productAllowance: 5_000, passportAllowance: 5_000, kind: "subscription" },
    ],
  ];
  for (const [envId, meta] of fromEnv) {
    if (envId && envId === id) return meta;
  }

  try {
    const raw = process.env.PADDLE_PRICE_PLAN_MAP_JSON;
    if (raw) {
      const map = JSON.parse(raw) as Record<string, PaddlePlanMeta>;
      if (map[id]) return map[id];
    }
  } catch {
    /* ignore malformed JSON */
  }
  return null;
}

export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret = process.env.PADDLE_WEBHOOK_SECRET
): boolean {
  if (!secret?.trim() || !signatureHeader?.trim()) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((chunk) => {
      const [k, ...rest] = chunk.split("=");
      return [k.trim(), rest.join("=")];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;
  const signed = `${ts}:${rawBody}`;
  const expected = crypto.createHmac("sha256", secret.trim()).update(signed).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(h1, "utf8"));
  } catch {
    return false;
  }
}

type PaddleApiResponse<T> = { data?: T; error?: { detail?: string; message?: string } };

async function paddleFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) throw new Error("PADDLE_API_KEY is not configured.");

  const res = await fetch(`${getPaddleApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as PaddleApiResponse<T>;
  if (!res.ok) {
    const msg =
      json.error?.detail || json.error?.message || res.statusText || "Paddle API error";
    throw new Error(`Paddle ${res.status}: ${msg}`);
  }
  return (json.data ?? json) as T;
}

export async function createPaddleCheckout(input: {
  organizationId: string;
  organizationSlug: string;
  priceId: string;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl?: string;
}): Promise<{ checkoutUrl: string; transactionId: string }> {
  const meta = paddlePlanByPriceId(input.priceId);
  if (!meta) {
    throw new Error("Unknown Paddle price. Configure PADDLE_PRICE_* env vars.");
  }

  const data = await paddleFetch<{ id: string; checkout?: { url?: string } }>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      items: [{ price_id: input.priceId, quantity: 1 }],
      customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      custom_data: {
        organization_id: input.organizationId,
        organization_slug: input.organizationSlug,
        plan: meta.plan,
        price_kind: meta.kind,
      },
      checkout: {
        url: input.successUrl,
      },
    }),
  });

  const checkoutUrl = data.checkout?.url;
  if (!checkoutUrl) {
    throw new Error("Paddle did not return a checkout URL.");
  }
  return { checkoutUrl, transactionId: data.id };
}

function extractOrganizationId(payload: Record<string, unknown>): string | null {
  const custom = payload.custom_data as Record<string, unknown> | undefined;
  if (custom?.organization_id) return String(custom.organization_id);
  const data = payload.data as Record<string, unknown> | undefined;
  const nestedCustom = data?.custom_data as Record<string, unknown> | undefined;
  if (nestedCustom?.organization_id) return String(nestedCustom.organization_id);
  return null;
}

function subscriptionPriceId(payload: Record<string, unknown>): string | null {
  const data = (payload.data || payload) as Record<string, unknown>;
  const items = data.items as Array<{ price?: { id?: string }; price_id?: string }> | undefined;
  const first = items?.[0];
  return first?.price?.id || first?.price_id || null;
}

function paddleEventId(event: Record<string, unknown>): string | null {
  const id = event.event_id || event.id;
  return id ? String(id) : null;
}

function mapPaddleStatusToBilling(status: string): BillingStatus {
  const s = status.toLowerCase();
  if (/active|trialing/.test(s)) return "active";
  if (/past_due/.test(s)) return "past_due";
  if (/paused/.test(s)) return "paused";
  if (/canceled|cancelled/.test(s)) return "canceled";
  return "active";
}

export async function syncOrganizationFromPaddleSubscription(
  client: SupabaseClient,
  input: {
    organizationId: string;
    paddleCustomerId?: string | null;
    paddleSubscriptionId?: string | null;
    priceId?: string | null;
    status?: string | null;
    billingEmail?: string | null;
    contractValue?: number | null;
    renewalDate?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<void> {
  const priceId = input.priceId || null;
  const meta = priceId ? paddlePlanByPriceId(priceId) : null;
  const billingStatus = mapPaddleStatusToBilling(String(input.status || "active"));
  const isCanceled = billingStatus === "canceled";
  const isPastDue = billingStatus === "past_due";
  const isPaused = billingStatus === "paused";

  if (meta?.kind === "subscription" && meta && !isCanceled && !isPaused) {
    await client
      .from("organizations")
      .update({
        plan: meta.plan,
        product_allowance: meta.productAllowance,
        passport_allowance: meta.passportAllowance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.organizationId);

    await recordBillingAudit(client, input.organizationId, "plan_activated", `${meta.plan} subscription synced`, {
      price_id: priceId,
      status: billingStatus,
    });
  } else if (isCanceled) {
    await recordBillingAudit(client, input.organizationId, "subscription_canceled", "Subscription canceled", {
      price_id: priceId,
    });
  }

  const billingPatch: Record<string, unknown> = {
    organization_id: input.organizationId,
    billing_provider: "paddle",
    plan_key: meta?.plan || undefined,
    paddle_customer_id: input.paddleCustomerId || undefined,
    paddle_subscription_id: input.paddleSubscriptionId || undefined,
    billing_email: input.billingEmail || undefined,
    billing_price_id: priceId || undefined,
    billing_period_start: input.periodStart || undefined,
    billing_period_end: input.periodEnd || undefined,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    renewal_date: input.renewalDate || undefined,
    updated_at: new Date().toISOString(),
  };

  if (isPastDue) {
    billingPatch.billing_status = "past_due";
    billingPatch.grace_period_until = gracePeriodEnd();
    billingPatch.cancellation_state = "past_due";
  } else if (isCanceled) {
    billingPatch.billing_status = "canceled";
    billingPatch.cancellation_state = "canceled";
    billingPatch.grace_period_until = null;
  } else if (isPaused) {
    billingPatch.billing_status = "paused";
    billingPatch.cancellation_state = "paused";
  } else if (meta?.kind === "subscription") {
    billingPatch.billing_status = "active";
    billingPatch.cancellation_state = null;
    billingPatch.grace_period_until = null;
  }

  if (input.contractValue != null) billingPatch.contract_value = input.contractValue;

  await client.from("billing_accounts").upsert(billingPatch, { onConflict: "organization_id" });
}

export async function isWebhookEventProcessed(
  client: SupabaseClient,
  externalEventId: string
): Promise<boolean> {
  const { data } = await client
    .from("billing_webhook_events")
    .select("id")
    .eq("provider", "paddle")
    .eq("external_event_id", externalEventId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function markWebhookEventProcessed(
  client: SupabaseClient,
  input: {
    externalEventId: string;
    eventType: string;
    organizationId?: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  await client.from("billing_webhook_events").insert({
    provider: "paddle",
    external_event_id: input.externalEventId,
    event_type: input.eventType,
    organization_id: input.organizationId || null,
    payload: input.payload || {},
  });
}

export async function handlePaddleWebhookEvent(
  client: SupabaseClient,
  event: Record<string, unknown>
): Promise<{ handled: boolean; organizationId?: string; duplicate?: boolean }> {
  const eventType = String(event.event_type || event.type || "");
  const externalEventId = paddleEventId(event);
  if (externalEventId) {
    const duplicate = await isWebhookEventProcessed(client, externalEventId);
    if (duplicate) return { handled: true, duplicate: true };
  }

  const data = (event.data || event) as Record<string, unknown>;

  let organizationId = extractOrganizationId(event);
  const customer = data.customer as Record<string, unknown> | undefined;
  const paddleCustomerId = String(customer?.id || data.customer_id || "") || null;
  const paddleSubscriptionId = String(data.id || data.subscription_id || "") || null;
  const priceId = subscriptionPriceId(event);
  const status = String(data.status || "");
  const billingEmail = customer?.email ? String(customer.email) : null;

  if (!organizationId && paddleCustomerId) {
    const { data: acct } = await client
      .from("billing_accounts")
      .select("organization_id")
      .eq("paddle_customer_id", paddleCustomerId)
      .maybeSingle();
    organizationId = acct?.organization_id || null;
  }
  if (!organizationId) return { handled: false };

  let handled = false;

  if (/subscription\.(created|updated|activated|resumed|renewed)/i.test(eventType)) {
    const nextBill = data.next_billed_at ? String(data.next_billed_at) : null;
    const periodStart = data.current_billing_period?.starts_at
      ? String(data.current_billing_period.starts_at)
      : data.started_at
        ? String(data.started_at)
        : null;
    const periodEnd = data.current_billing_period?.ends_at
      ? String(data.current_billing_period.ends_at)
      : nextBill;
    await syncOrganizationFromPaddleSubscription(client, {
      organizationId,
      paddleCustomerId,
      paddleSubscriptionId,
      priceId,
      status,
      billingEmail,
      renewalDate: nextBill?.slice(0, 10) || null,
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: Boolean(data.scheduled_change?.action === "cancel"),
    });
    handled = true;
  }

  if (/subscription\.(canceled|paused|past_due)/i.test(eventType)) {
    await syncOrganizationFromPaddleSubscription(client, {
      organizationId,
      paddleCustomerId,
      paddleSubscriptionId,
      priceId,
      status,
      billingEmail,
    });
    if (/past_due/i.test(eventType)) {
      await recordBillingAudit(client, organizationId, "payment_past_due", "Subscription past due — grace period started", {});
    }
    handled = true;
  }

  if (/transaction\.(completed|paid|payment_failed)/i.test(eventType)) {
    const totals = data.details as { totals?: { total?: string } } | undefined;
    const amount = totals?.totals?.total ? Number(totals.totals.total) / 100 : null;
    const txPriceId =
      (data.items as Array<{ price?: { id?: string }; price_id?: string }> | undefined)?.[0]?.price?.id ||
      (data.items as Array<{ price_id?: string }> | undefined)?.[0]?.price_id ||
      priceId;
    const txMeta = txPriceId ? paddlePlanByPriceId(txPriceId) : null;

    await client.from("billing_accounts").upsert(
      {
        organization_id: organizationId,
        paddle_customer_id: paddleCustomerId,
        amount_collected: amount ?? undefined,
        invoice_status: /payment_failed/i.test(eventType) ? "failed" : "paid",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );

    if (txMeta?.kind === "implementation" && /completed|paid/i.test(eventType)) {
      await recordBillingAudit(client, organizationId, "implementation_paid", "Implementation fee recorded", {
        price_id: txPriceId,
      });
    }
    handled = true;
  }

  if (externalEventId && handled) {
    await markWebhookEventProcessed(client, {
      externalEventId,
      eventType,
      organizationId,
      payload: { event_type: eventType },
    });
  }

  return { handled, organizationId };
}

export function defaultCheckoutPriceForPlan(plan: PlanKey): string | null {
  const normalized = normalizePlanKey(plan);
  if (normalized === "platform") {
    return (
      process.env.PADDLE_PRICE_PLATFORM?.trim() ||
      process.env.PADDLE_PRICE_SAAS_PLATFORM?.trim() ||
      process.env.PADDLE_PRICE_SAAS_STARTER?.trim() ||
      null
    );
  }
  if (normalized === "professional" || plan === "saas") {
    return (
      process.env.PADDLE_PRICE_PROFESSIONAL?.trim() ||
      process.env.PADDLE_PRICE_SAAS_PROFESSIONAL?.trim() ||
      process.env.PADDLE_PRICE_SAAS_GROWTH?.trim() ||
      null
    );
  }
  if (normalized === "founding_pilot") {
    return (
      process.env.PADDLE_PRICE_IMPLEMENTATION?.trim() ||
      process.env.PADDLE_PRICE_FOUNDING_PILOT?.trim() ||
      null
    );
  }
  return null;
}

export function checkoutPricesForPlan(plan: PlanKey): {
  subscriptionPriceId: string | null;
  implementationPriceId: string | null;
} {
  return {
    subscriptionPriceId: defaultCheckoutPriceForPlan(plan),
    implementationPriceId:
      process.env.PADDLE_PRICE_IMPLEMENTATION?.trim() ||
      process.env.PADDLE_PRICE_FOUNDING_PILOT?.trim() ||
      null,
  };
}
