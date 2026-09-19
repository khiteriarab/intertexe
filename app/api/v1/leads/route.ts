import { NextRequest, NextResponse } from "next/server";
import { sendCustomerEmail } from "../../../../lib/resend-customer";
import { EMAIL_TYPES, PLATFORM_LEAD_CC, PLATFORM_LEAD_TO } from "../../../../lib/email-constants";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { clientIpFromHeaders, demoRateLimit } from "../../../../lib/platform-demo-rate-limit";
import { provisionPilotWorkspaceFromLead } from "../../../../lib/enterprise/provision-pilot-workspace";
import {
  leadModulesSummary,
  parseModuleKeysParam,
} from "../../../../lib/enterprise/pricing-modules";

export const dynamic = "force-dynamic";

const INTENTS = new Set(["snapshot", "founding_pilot", "api_access", "saas", "enterprise", "ebook"]);
const COMPANY_TYPES = new Set(["brand", "retailer", "supplier", "other"]);
const TIERS = new Set(["professional", "platform", "enterprise"]);

export function cleanLeadField(v: unknown, max = 200) {
  return String(v || "").trim().slice(0, max);
}

export function parseLeadBody(body: Record<string, unknown>) {
  if (cleanLeadField(body.company_fax)) return { honeypot: true as const };
  const firstName = cleanLeadField(body.first_name, 80);
  const lastName = cleanLeadField(body.last_name, 80);
  const email = cleanLeadField(body.email, 120).toLowerCase();
  const company = cleanLeadField(body.company, 120);
  const intent = cleanLeadField(body.intent, 40);
  if (!firstName || !lastName || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Name, work email and company are required." as const };
  }
  if (!INTENTS.has(intent)) {
    return { error: "Unknown request type." as const };
  }
  const companyTypeRaw = cleanLeadField(body.company_type, 40);
  const tierRaw = cleanLeadField(body.tier, 40).toLowerCase();
  const tier = TIERS.has(tierRaw) ? tierRaw : null;
  const moduleKeys = parseModuleKeysParam(
    Array.isArray(body.modules) ? body.modules.join(",") : cleanLeadField(body.modules, 240),
  );
  const modulesSummary = leadModulesSummary(moduleKeys);
  const catalogFromForm = cleanLeadField(body.catalog_system, 120) || null;
  // Persist pricing selection on the lead row (no dedicated column yet).
  const pricingProfile = moduleKeys.length
    ? `modules:${moduleKeys.join(",")}${tier ? `|tier:${tier}` : ""}`.slice(0, 200)
    : tier
      ? `Plan interest: ${tier}`
      : null;
  const catalog_system = catalogFromForm || pricingProfile;

  return {
    row: {
      first_name: firstName,
      last_name: lastName,
      email,
      company,
      role: cleanLeadField(body.role, 80) || null,
      company_website: cleanLeadField(body.company_website, 200) || null,
      product_count: cleanLeadField(body.product_count, 40) || null,
      sells_into_eu: cleanLeadField(body.sells_into_eu, 40) || null,
      catalog_system,
      intent,
      source_cta: cleanLeadField(body.source_cta, 80) || null,
    },
    extras: {
      phone: cleanLeadField(body.phone, 40) || null,
      country: cleanLeadField(body.country, 80) || null,
      company_type: COMPANY_TYPES.has(companyTypeRaw) ? companyTypeRaw : null,
      message: cleanLeadField(body.message, 1200) || null,
      tier,
      modules: moduleKeys,
      modules_summary: modulesSummary,
    },
  };
}

export async function POST(req: NextRequest) {
  const limited = demoRateLimit(`lead:${clientIpFromHeaders(req.headers)}`);
  if (!limited.ok) {
    return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (cleanLeadField(body.company_fax)) {
    return NextResponse.json({ ok: true, duplicate: false });
  }

  const parsed = parseLeadBody(body);
  if ("honeypot" in parsed) {
    return NextResponse.json({ ok: true, duplicate: false });
  }
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const row = parsed.row;
  const extras = parsed.extras;
  const { first_name: firstName, last_name: lastName, email, company, intent } = row;

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("material_snapshot_leads")
    .select("id")
    .eq("email", email)
    .eq("intent", intent)
    .gte("created_at", since)
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const { error } = await supabase.from("material_snapshot_leads").insert(row);
  if (error) {
    return NextResponse.json({ error: "Could not store this request." }, { status: 500 });
  }

  const salesTo = process.env.PLATFORM_SALES_EMAIL || PLATFORM_LEAD_TO;
  const salesCc =
    salesTo.toLowerCase() === PLATFORM_LEAD_CC.toLowerCase() ? undefined : PLATFORM_LEAD_CC;
  const tier = extras.tier || cleanLeadField(body.tier, 40) || null;
  const modulesSummary = extras.modules_summary;
  const intentLabel =
    intent === "founding_pilot"
      ? "Implementation & onboarding"
      : intent === "enterprise"
        ? "Enterprise (custom)"
        : intent === "ebook"
          ? "Software guide ebook"
          : intent === "saas" || intent === "api_access"
            ? modulesSummary
              ? "SaaS — selected modules"
              : tier
                ? `SaaS — ${tier}`
                : "Professional, Platform, or Enterprise"
            : "10-product pilot workspace";
  const companyTypeLabel =
    extras.company_type === "brand"
      ? "Fashion or textile brand"
      : extras.company_type === "retailer"
        ? "Retailer / wholesaler"
        : extras.company_type === "supplier"
          ? "Manufacturer / supplier"
          : extras.company_type === "other"
            ? "Other"
            : "—";

  await sendCustomerEmail({
    to: salesTo,
    cc: salesCc,
    replyTo: email,
    subject: `Platform lead: ${intentLabel} — ${company}`,
    emailType: EMAIL_TYPES.PLATFORM_LEAD,
    html: `<p>${firstName} ${lastName} (${email}) at ${company} requested ${intentLabel}.</p>
<p>Role: ${row.role || "—"}<br/>Phone: ${extras.phone || "—"}<br/>Country / region: ${extras.country || "—"}<br/>Company type: ${companyTypeLabel}<br/>Website: ${row.company_website || "—"}<br/>Products: ${row.product_count || "—"}<br/>Sells into EU: ${row.sells_into_eu || "—"}<br/>Catalog / pricing profile: ${row.catalog_system || "—"}<br/>Plan tier: ${tier || "—"}<br/>Modules: ${modulesSummary || (extras.modules.length ? extras.modules.join(", ") : "—")}<br/>Message: ${extras.message || "—"}<br/>CTA: ${row.source_cta || "—"}</p>
<p>No catalog file was accepted via the public form.</p>`,
    metadata: {
      intent,
      company,
      tier: tier || "",
      modules: extras.modules.join(","),
    },
  }).catch(() => {});

  let pilotProvision: Awaited<ReturnType<typeof provisionPilotWorkspaceFromLead>> | null = null;
  if (intent === "snapshot") {
    pilotProvision = await provisionPilotWorkspaceFromLead({
      companyName: company,
      contactEmail: email,
      firstName,
      lastName,
    }).catch(() => ({ status: "skipped" as const, reason: "provision_failed" }));
  }

  const workspaceReady =
    pilotProvision?.status === "created" || pilotProvision?.status === "existing"
      ? pilotProvision.workspaceUrl
      : null;

  const ebookGuideUrl = "https://intertexe.com/platform/intertexe-software-guide.html";
  await sendCustomerEmail({
    to: email,
    subject: workspaceReady
      ? "Your INTERTEXE pilot workspace is ready"
      : intent === "ebook"
        ? "Your INTERTEXE software guide"
        : "We received your INTERTEXE request",
    emailType: EMAIL_TYPES.PLATFORM_LEAD,
    html: workspaceReady
      ? `<p>Your 10-product pilot workspace for ${company} is ready.</p>
<p><a href="${workspaceReady}">Open your workspace</a> — set your password if this is your first sign-in, then import up to 10 products.</p>
<p>Do not send confidential catalogs in email until we arrange secure transfer.</p>`
      : intent === "ebook"
        ? `<p>Thanks for downloading the INTERTEXE software guide.</p>
<p><a href="${ebookGuideUrl}">Open your guide</a> — a practical walkthrough of governed records, passports, delivery and resale.</p>
<p>When you are ready, <a href="https://intertexe.com/platform/request">request a demo</a> with the INTERTEXE team.</p>`
        : `<p>We received your request. The INTERTEXE team will review your catalog profile and reply with the next step for your 10-product pilot.</p>
<p>Do not send confidential catalogs in email until we arrange secure transfer.</p>`,
    metadata: { intent: "confirmation", workspaceReady: Boolean(workspaceReady) },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    duplicate: false,
    workspaceReady: Boolean(workspaceReady),
    workspaceUrl: workspaceReady,
  });
}
