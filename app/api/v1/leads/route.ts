import { NextRequest, NextResponse } from "next/server";
import { sendCustomerEmail } from "../../../../lib/resend-customer";
import { EMAIL_TYPES, PLATFORM_LEAD_CC, PLATFORM_LEAD_TO } from "../../../../lib/email-constants";
import { getServerSupabase } from "../../../../lib/supabase-service-client";
import { clientIpFromHeaders, demoRateLimit } from "../../../../lib/platform-demo-rate-limit";

export const dynamic = "force-dynamic";

const INTENTS = new Set(["snapshot", "founding_pilot", "api_access"]);
const COMPANY_TYPES = new Set(["brand", "retailer", "supplier", "other"]);

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
      catalog_system: cleanLeadField(body.catalog_system, 120) || null,
      intent,
      source_cta: cleanLeadField(body.source_cta, 80) || null,
    },
    extras: {
      phone: cleanLeadField(body.phone, 40) || null,
      country: cleanLeadField(body.country, 80) || null,
      company_type: COMPANY_TYPES.has(companyTypeRaw) ? companyTypeRaw : null,
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
  const intentLabel =
    intent === "founding_pilot"
      ? "Founding Pilot"
      : intent === "api_access"
        ? "Platform access"
        : "10-product snapshot";
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
<p>Role: ${row.role || "—"}<br/>Phone: ${extras.phone || "—"}<br/>Country / region: ${extras.country || "—"}<br/>Company type: ${companyTypeLabel}<br/>Website: ${row.company_website || "—"}<br/>Products: ${row.product_count || "—"}<br/>Sells into EU: ${row.sells_into_eu || "—"}<br/>Catalog: ${row.catalog_system || "—"}<br/>CTA: ${row.source_cta || "—"}</p>
<p>No catalog file was accepted via the public form.</p>`,
    metadata: { intent, company },
  }).catch(() => {});

  await sendCustomerEmail({
    to: email,
    subject: "We received your INTERTEXE request",
    emailType: EMAIL_TYPES.PLATFORM_LEAD,
    html: `<p>We received your request. The INTERTEXE team will review your catalog profile and reply with the next step for a 10-product snapshot.</p>
<p>Do not send confidential catalogs in email until we arrange secure transfer.</p>`,
    metadata: { intent: "confirmation" },
  }).catch(() => {});

  return NextResponse.json({ ok: true, duplicate: false });
}
