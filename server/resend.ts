import { Resend } from "resend";
import { render } from "@react-email/render";
import WelcomeEmail from "../emails/WelcomeEmail";
import { EMAIL_FROM } from "../lib/email-constants";

/** Sends welcome email after signup; no-ops when RESEND_API_KEY is unset. */
export async function sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const name = firstName?.trim() || "";
  const emailHtml = await render(WelcomeEmail({ firstName: name }));

  await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: `Welcome to Intertexe${name ? `, ${name}` : ""}.`,
    html: emailHtml,
  });
}
