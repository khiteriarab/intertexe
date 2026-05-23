import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set — skipping welcome email');
    return;
  }
  try {
    await resend.emails.send({
      from: 'INTERTEXE · <info@intertexe.com>',
      to: email,
      subject: 'Welcome to Intertexe',
      html: `
        <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; background: #F8FAF9; padding: 48px 32px;">
          <p style="font-size: 11px; letter-spacing: 0.2em; color: #0D9488; margin: 0 0 32px;">INTERTEXE · THE MATERIAL STANDARD</p>
          <h1 style="font-size: 28px; color: #1C2B2A; font-weight: normal; margin: 0 0 16px;">Welcome${name ? ', ' + name : ''}.</h1>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">The only place where polyester does not exist.</p>
          <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">You now have access to 17,000+ verified natural fiber products — silk, linen, cashmere, cotton, wool — from 100+ brands in one place.</p>
          <a href="https://www.intertexe.com/shop" style="display: inline-block; background: #1C2B2A; color: white; padding: 14px 28px; text-decoration: none; font-size: 13px; letter-spacing: 0.1em;">START SHOPPING</a>
          <p style="color: #94A3B8; font-size: 11px; margin: 48px 0 0; letter-spacing: 0.05em;">intertexe.com · info@intertexe.com · @intertexe</p>
        </div>
      `
    });
  } catch (e) {
    console.error('Welcome email failed silently:', e);
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  // Password reset is now handled by Supabase Auth natively via resetPasswordForEmail
  // This function is kept for import compatibility only
  console.log('sendPasswordResetEmail called — now handled by Supabase Auth');
}
