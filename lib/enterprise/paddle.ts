import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanKey } from "./entitlements";

export type PaddleEnvironment = "sandbox" | "production";

export type PaddlePlanMeta = {
  plan: PlanKey;
  productAllowance: number | null;
  passportAllowance: number | null;
};

export function getPaddleEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox";
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
      process.env.PADDLE_PRICE_FOUNDING_PILOT,
      { plan: "founding_pilot", productAllowance: 500, passportAllowance: 100 },
    ],
    [
      process.env.PADDLE_PRICE_SAAS_STARTER,
      { plan: "saas", productAllowance: 2000, passportAllowance: 500 },
    ],
    [
      process.env.PADDLE_PRICE_SAAS_GROWTH,
      { plan: "saas", productAllowance: null, passportAllowance: null },
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
  }
): Promise<void> {
  const priceId = input.priceId || null;
  const meta = priceId ? paddlePlanByPriceId(priceId) : null;
  const canceled = /cancel|past_due|paused/i.test(String(input.status || ""));

  if (meta && !canceled) {
    await client
      .from("organizations")
      .update({
        plan: meta.plan,
        product_allowance: meta.productAllowance,
        passport_allowance: meta.passportAllowance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.organizationId);
  } else if (canceled) {
    await client
      .from("organizations")
      .update({
        plan: "free_snapshot",
        product_allowance: 10,
        passport_allowance: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.organizationId);
  }

  const billingPatch: Record<string, unknown> = {
    organization_id: input.organizationId,
    plan_key: meta?.plan || (canceled ? "free_snapshot" : undefined),
    paddle_customer_id: input.paddleCustomerId || undefined,
    paddle_subscription_id: input.paddleSubscriptionId || undefined,
    billing_email: input.billingEmail || undefined,
    cancellation_state: canceled ? String(input.status || "canceled") : null,
    renewal_date: input.renewalDate || undefined,
    updated_at: new Date().toISOString(),
  };
  if (input.contractValue != null) billingPatch.contract_value = input.contractValue;

  await client.from("billing_accounts").upsert(billingPatch, { onConflict: "organization_id" });
}

export async function handlePaddleWebhookEvent(
  client: SupabaseClient,
  event: Record<string, unknown>
): Promise<{ handled: boolean; organizationId?: string }> {
  const eventType = String(event.event_type || event.type || "");
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

  if (/subscription\.(created|updated|activated)/i.test(eventType)) {
    const nextBill = data.next_billed_at ? String(data.next_billed_at).slice(0, 10) : null;
    await syncOrganizationFromPaddleSubscription(client, {
      organizationId,
      paddleCustomerId,
      paddleSubscriptionId,
      priceId,
      status,
      billingEmail,
      renewalDate: nextBill,
    });
    return { handled: true, organizationId };
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
    return { handled: true, organizationId };
  }

  if (/transaction\.(completed|paid)/i.test(eventType)) {
    const totals = data.details as { totals?: { total?: string } } | undefined;
    const amount = totals?.totals?.total ? Number(totals.totals.total) / 100 : null;
    await client
      .from("billing_accounts")
      .upsert(
        {
          organization_id: organizationId,
          paddle_customer_id: paddleCustomerId,
          amount_collected: amount ?? undefined,
          invoice_status: "paid",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" }
      );
    return { handled: true, organizationId };
  }

  return { handled: false, organizationId };
}

export function defaultCheckoutPriceForPlan(plan: PlanKey): string | null {
  if (plan === "founding_pilot") return process.env.PADDLE_PRICE_FOUNDING_PILOT?.trim() || null;
  if (plan === "saas") return process.env.PADDLE_PRICE_SAAS_STARTER?.trim() || null;
  return process.env.PADDLE_PRICE_FOUNDING_PILOT?.trim() || null;
}
