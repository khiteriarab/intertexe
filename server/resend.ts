import { Resend } from "resend";

/** Sends welcome email after signup; no-ops when RESEND_API_KEY is unset. */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Intertexe <hello@intertexe.com>";
  const displayName = name?.trim() || "there";

  await resend.emails.send({
    from,
    to: email,
    subject: "Welcome to Intertexe",
    html: `<p>Hi ${displayName},</p><p>Welcome to Intertexe — verified natural-fiber fashion, curated for you.</p><p><a href="https://www.intertexe.com">Explore the catalog</a></p>`,
  });
}
