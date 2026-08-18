export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getUserByUsername } from "../../../../lib/auth-helpers";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { linkScannerSessionToUser } from "../../../../lib/link-scanner-session";
import { sendWelcomeEmail } from "../../../../server/resend";
import { syncContactToLoops } from "../../../../lib/loops";
import { snakeToCamel } from "../../../../lib/case-utils";
import {
  generatePermanentReferralCode,
  recordReferral,
} from "../../../../lib/invitation-codes";
import {
  emitAttributedEvent,
  extractFirstTouchFromRequest,
  firstTouchToPreferenceColumns,
} from "../../../../lib/dashboard/attribution";
import { linkHqContactOnSignup } from "../../../../lib/hq-contacts";

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || "";
    const country =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      "";
    const EU_COUNTRIES = new Set([
      "ES", "FR", "IT", "DE", "NL", "PT", "IE", "BE", "AT", "SE", "DK", "FI",
      "PL", "CZ", "HU", "RO", "BG", "HR", "SK", "SI", "EE", "LV", "LT", "LU",
      "MT", "CY", "GR",
    ]);
    const isEU = EU_COUNTRIES.has(String(country).toUpperCase());
    const body = await request.json();
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      username: providedUsername,
      invitationCode,
      gdprConsent,
    } = body;
    const firstTouch = extractFirstTouchFromRequest(request, body);
    if (!firstTouch.first_session_id && sessionId) {
      firstTouch.first_session_id = sessionId;
    }
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const resolvedFirst = String(firstName || name || "").trim();
    const resolvedLast = String(lastName || "").trim();
    const fullName = `${resolvedFirst} ${resolvedLast}`.trim() || null;

    const username = providedUsername || email;
    const cleanEmail = String(email).trim();

    const existingEmail = await getUserByEmail(cleanEmail);
    if (existingEmail) {
      return NextResponse.json({ message: "Email already registered" }, { status: 400 });
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 400 });
    }

    const auth = getSupabaseAnonAuthClient();
    if (!auth) {
      return NextResponse.json(
        { message: "Unable to create account. Please try again later." },
        { status: 500 }
      );
    }

    const { data, error } = await auth.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          first_name: resolvedFirst || null,
          last_name: resolvedLast || null,
          full_name: fullName,
          name: fullName,
        },
      },
    });

    if (error) {
      const msg = error.message?.toLowerCase().includes("already")
        ? "An account with this email already exists"
        : error.message || "Unable to create account";
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    const user = data.user;
    if (user?.id) {
      const service = createServiceClient();
      if (service) {
        const existingRes = await service
          .from("user_preferences")
          .select("user_id, first_touch_at")
          .eq("user_id", user.id)
          .maybeSingle();
        const attributionReady =
          !existingRes.error ||
          !(
            existingRes.error.message?.includes("first_touch_at") ||
            existingRes.error.code === "42703"
          );
        const existingPref = attributionReady ? existingRes.data : null;

        const basePref: Record<string, unknown> = {
          user_id: user.id,
          email: cleanEmail.toLowerCase(),
          marketing_emails: true,
          first_name: resolvedFirst || null,
          last_name: resolvedLast || null,
          gdpr_consent: isEU ? gdprConsent === true : gdprConsent !== false,
          gdpr_consent_date: new Date().toISOString(),
          gdpr_consent_version: "1.0",
          updated_at: new Date().toISOString(),
        };

        if (attributionReady && !existingPref?.first_touch_at) {
          Object.assign(basePref, firstTouchToPreferenceColumns(firstTouch));
          if (typeof invitationCode === "string" && invitationCode.trim()) {
            basePref.attribution_extra = {
              ...(firstTouch.attribution_extra || {}),
              referral_code: invitationCode.trim(),
            };
          }
        }

        const { error: upsertError } = await service
          .from("user_preferences")
          .upsert(basePref, { onConflict: "user_id" });
        // If migration not applied yet, fall back to core profile fields only.
        if (
          upsertError &&
          (upsertError.message?.includes("first_touch") ||
            upsertError.message?.includes("attribution_extra") ||
            upsertError.code === "42703")
        ) {
          const { first_touch_source: _a, first_touch_medium: _b, first_touch_campaign: _c,
            first_touch_content: _d, first_touch_term: _e, first_referrer: _f,
            first_landing_page: _g, first_session_id: _h, ga_client_id: _i,
            gclid: _j, ttclid: _k, fbclid: _l, msclkid: _m, first_touch_at: _n,
            acquisition_platform: _o, attribution_extra: _p, ...coreOnly } = basePref as any;
          await service.from("user_preferences").upsert(coreOnly, { onConflict: "user_id" });
        }
      }

      await generatePermanentReferralCode(user.id);
      if (typeof invitationCode === "string" && invitationCode.trim()) {
        await recordReferral(invitationCode, user.id);
      }

      emitAttributedEvent({
        eventName: "signup",
        eventCategory: "acquisition",
        customerId: user.id,
        source: "website",
        sessionId: firstTouch.first_session_id || sessionId || undefined,
        utm: {
          utm_source: firstTouch.utm_source,
          utm_medium: firstTouch.utm_medium,
          utm_campaign: firstTouch.utm_campaign,
          utm_content: firstTouch.utm_content,
          utm_term: firstTouch.utm_term,
        },
        metadata: {
          invitationCode: invitationCode || null,
          first_referrer: firstTouch.first_referrer || null,
          first_landing_page: firstTouch.first_landing_page || null,
          ga_client_id: firstTouch.ga_client_id || null,
          gclid: firstTouch.gclid || null,
          ttclid: firstTouch.ttclid || null,
          fbclid: firstTouch.fbclid || null,
          msclkid: firstTouch.msclkid || null,
        },
      }).catch(() => null);

      await linkHqContactOnSignup({ email: cleanEmail, userId: user.id }).catch(() => null);
    }

    // Canonical founder welcome via Loops (idempotent + logged). No Resend welcome.
    // Must await: Vercel can freeze the isolate after the HTTP response, leaving
    // email_deliveries stuck at pending.
    await sendWelcomeEmail({
      email: cleanEmail,
      firstName: resolvedFirst || fullName || "",
      lastName: resolvedLast || undefined,
      userId: user?.id || null,
      source: "web_signup",
      invitationCode: typeof invitationCode === "string" ? invitationCode : undefined,
    }).catch(console.error);

    // Contact sync for mailing lists / audience (separate from Founder Welcome transactional).
    // Do not create a Loops Loop that also sends Welcome on contact create — that duplicates Day 0.
    await syncContactToLoops({
      email: cleanEmail,
      firstName: resolvedFirst || undefined,
      lastName: resolvedLast || undefined,
      source: "signup",
      invitationCode: typeof invitationCode === "string" ? invitationCode : undefined,
    }).catch(console.error);

    const session = data.session;
    if (!session?.access_token || !user?.id) {
      return NextResponse.json(
        {
          message: "Account created. Check your email to confirm, then sign in.",
          needsEmailConfirmation: true,
        },
        { status: 201 }
      );
    }

    const sid = firstTouch.first_session_id || sessionId;
    if (sid) {
      await linkScannerSessionToUser(sid, user.id);
    }

    return NextResponse.json(
      {
        ...snakeToCamel({
          id: user.id,
          email: user.email ?? cleanEmail,
          name: fullName,
          username: cleanEmail,
        }),
        token: session.access_token,
        refreshToken: session.refresh_token || null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = err?.message || "Something went wrong. Please try again.";
    const isUserError = msg.includes("already exists") || msg.includes("already registered");
    return NextResponse.json({ message: msg }, { status: isUserError ? 400 : 500 });
  }
}
