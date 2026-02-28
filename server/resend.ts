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
<tr><td align="center" style="padding:48px 20px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

<tr><td style="padding:0 0 40px 0;text-align:center;">
<span style="font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:8px;color:#111111;"><span style="font-weight:300;">INTER</span><span style="font-weight:700;">TEXE</span></span>
</td></tr>

<tr><td style="padding:0 0 40px 0;">
<hr style="border:none;border-top:1px solid #111111;margin:0;">
</td></tr>

<tr><td style="padding:0 0 20px 0;">
<h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#111111;">Welcome, ${name}.</h2>
</td></tr>

<tr><td style="padding:0 0 28px 0;font-size:15px;line-height:1.8;color:#444444;">
You've joined a community that believes material quality is non-negotiable. We vet every brand so you never have to read a label or second-guess a purchase again.
</td></tr>

<tr><td style="padding:0 0 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:16px 0;border-bottom:1px solid #EEEEEE;">
<span style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#999999;">What's next</span>
</td></tr>
<tr><td style="padding:18px 0;border-bottom:1px solid #EEEEEE;">
<strong style="font-size:14px;color:#111111;">Discover Your Fabric Persona</strong>
<div style="font-size:13px;color:#666666;margin-top:4px;line-height:1.6;">Take our 2-minute quiz and find out which designers match your material standards.</div>
</td></tr>
<tr><td style="padding:18px 0;border-bottom:1px solid #EEEEEE;">
<strong style="font-size:14px;color:#111111;">Browse 11,000+ Designers</strong>
<div style="font-size:13px;color:#666666;margin-top:4px;line-height:1.6;">Every brand in our directory is ranked by natural fiber quality, from Exceptional to Caution.</div>
</td></tr>
<tr><td style="padding:18px 0;border-bottom:1px solid #EEEEEE;">
<strong style="font-size:14px;color:#111111;">Learn the Buying Rules</strong>
<div style="font-size:13px;color:#666666;margin-top:4px;line-height:1.6;">10 definitive fabric guides tell you exactly what to look for, what to avoid, and what to pay.</div>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 0 40px 0;text-align:center;">
<a href="https://intertexe.com/quiz" style="display:inline-block;background-color:#111111;color:#FAFAF8;text-decoration:none;padding:16px 48px;font-size:12px;letter-spacing:3px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-transform:uppercase;">Find My Designers</a>
</td></tr>

<tr><td style="padding:32px 0 0 0;border-top:1px solid #E8E8E8;text-align:center;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#AAAAAA;margin-bottom:8px;">
<span style="font-weight:300;">INTER</span><span style="font-weight:600;">TEXE</span>
</div>
<div style="font-size:11px;color:#BBBBBB;line-height:1.6;">
Material Quality First
</div>
<div style="font-size:10px;color:#CCCCCC;margin-top:12px;">
You're receiving this because you created an account at intertexe.com
</div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
