// Resend integration via Replit connector
// WARNING: Never cache the client — access tokens expire, so credentials
// must be fetched fresh each time.
import { Resend } from "resend";

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  const settings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (!settings || !settings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: settings.settings.api_key,
    fromEmail: settings.settings.from_email,
  };
}

async function getFreshResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendWelcomeEmail(toEmail: string, name?: string | null) {
  try {
    const { client, fromEmail } = await getFreshResendClient();
    const firstName = name || "there";

    await client.emails.send({
      from: fromEmail || "INTERTEXE <noreply@intertexe.com>",
      to: toEmail,
      subject: "Welcome to INTERTEXE",
      html: buildWelcomeHtml(firstName),
    });

    console.log(`Welcome email sent to ${toEmail}`);
  } catch (err: any) {
    console.error("Failed to send welcome email:", err.message);
  }
}

function buildWelcomeHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<!-- Header -->
<tr><td style="padding:0 0 32px 0;text-align:center;">
<h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;letter-spacing:6px;color:#111111;">INTERTEXE</h1>
</td></tr>

<!-- Divider -->
<tr><td style="padding:0 0 32px 0;">
<hr style="border:none;border-top:1px solid #111111;margin:0;">
</td></tr>

<!-- Welcome -->
<tr><td style="padding:0 0 24px 0;">
<h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#111111;">Welcome, ${name}</h2>
</td></tr>

<tr><td style="padding:0 0 24px 0;font-size:15px;line-height:1.7;color:#333333;">
Thank you for joining INTERTEXE. You now have access to our curated directory of designers ranked by their commitment to natural fiber quality.
</td></tr>

<tr><td style="padding:0 0 24px 0;font-size:15px;line-height:1.7;color:#333333;">
Here's what you can do:
</td></tr>

<!-- Features -->
<tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.7;color:#333333;">
&mdash;&ensp;<strong>Browse 11,000+ designers</strong> ranked by natural fiber percentage
</td></tr>
<tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.7;color:#333333;">
&mdash;&ensp;<strong>Take the Material Quiz</strong> to discover your fabric profile
</td></tr>
<tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.7;color:#333333;">
&mdash;&ensp;<strong>Save your favorites</strong> and build your personal designer library
</td></tr>
<tr><td style="padding:0 0 32px 0;font-size:15px;line-height:1.7;color:#333333;">
&mdash;&ensp;<strong>Get AI recommendations</strong> tailored to your material preferences
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 0 32px 0;text-align:center;">
<a href="https://intertexe.vercel.app/quiz" style="display:inline-block;background-color:#111111;color:#FAFAF8;text-decoration:none;padding:14px 40px;font-size:13px;letter-spacing:2px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-transform:uppercase;">Take the Quiz</a>
</td></tr>

<!-- Divider -->
<tr><td style="padding:0 0 24px 0;">
<hr style="border:none;border-top:1px solid #E0E0E0;margin:0;">
</td></tr>

<!-- Footer -->
<tr><td style="padding:0 0 8px 0;text-align:center;font-size:12px;color:#999999;letter-spacing:1px;">
INTERTEXE &mdash; Material Quality First
</td></tr>
<tr><td style="text-align:center;font-size:11px;color:#BBBBBB;">
You're receiving this because you created an account at intertexe.com
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
