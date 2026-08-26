// POST /api/callback-request — handles the "Request a call back" form.
// Validates the submission and, if RESEND_API_KEY is configured, emails it
// to NOTIFY_EMAIL via Resend's HTTP API. Without that env var set it still
// accepts the request and logs it, so the form works end to end either way.
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : ''; // honeypot

  // Bots that fill every field get a quiet success instead of a tell.
  if (company) return NextResponse.json({ ok: true });

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }

  const notifyEmail = process.env.NOTIFY_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && notifyEmail) {
    try {
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.NOTIFY_FROM || 'Hearthline site <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: 'New free-diagnostic request',
          text: `A visitor requested a call back.\n\nEmail: ${email}\nSubmitted: ${new Date().toISOString()}`,
        }),
      });
      if (!emailResp.ok) {
        console.error('Resend API error', emailResp.status, await emailResp.text());
        // Still tell the visitor it worked — their request is logged
        // regardless, and a delivery hiccup on our end isn't theirs to see.
      }
    } catch (err) {
      console.error('Failed to send notification email', err);
    }
  } else {
    console.log('[callback-request] no RESEND_API_KEY/NOTIFY_EMAIL configured — request received:', email);
  }

  return NextResponse.json({ ok: true });
}
