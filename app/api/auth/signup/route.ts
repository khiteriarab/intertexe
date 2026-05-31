export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getUserByUsername } from "../../../../lib/auth-helpers";
import { getSupabaseAnonAuthClient } from "../../../../lib/supabase-auth-server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { linkScannerSessionToUser } from "../../../../lib/link-scanner-session";
import { sendWelcomeEmail } from "../../../../server/resend";
import { syncContactToLoops } from "../../../../lib/loops";
import { snakeToCamel } from "../../../../lib/case-utils";

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
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      username: providedUsername,
      invitationCode,
      gdprConsent,
    } = await request.json();
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
      return NextResponse.json({ message: "Unable to create account. Please try again later." }, { status: 500 });
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
        await service.from("user_preferences").upsert(
          {
            user_id: user.id,
            email: cleanEmail.toLowerCase(),
            marketing_emails: true,
            first_name: resolvedFirst || null,
            last_name: resolvedLast || null,
            gdpr_consent: isEU ? gdprConsent === true : gdprConsent !== false,
            gdpr_consent_date: new Date().toISOString(),
            gdpr_consent_version: "1.0",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    }

    sendWelcomeEmail(cleanEmail, resolvedFirst || fullName || "").catch(console.error);
    syncContactToLoops({
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

    if (sessionId) {
      await linkScannerSessionToUser(sessionId, user.id);
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
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg = err?.message || "Something went wrong. Please try again.";
    const isUserError = msg.includes("already exists") || msg.includes("already registered");
    return NextResponse.json({ message: msg }, { status: isUserError ? 400 : 500 });
  }
}
