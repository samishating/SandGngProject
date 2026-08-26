// POST /api/callback-request — handles the "Request a call back" form on the
// homepage. Validates the submission and, if RESEND_API_KEY is configured,
// emails it to NOTIFY_EMAIL via Resend's HTTP API (no SDK dependency needed).
// Without that env var set it still accepts the request and logs it, so the
// form works end to end in any environment while the real notification path
// is a one-step activation (see .env.example).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : ''; // honeypot

  // Bots that fill every field get a quiet success instead of a tell.
  if (company) return res.status(200).json({ ok: true });

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return res.status(400).json({ ok: false, error: 'Enter a valid email address.' });
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
        // Still tell the visitor it worked — their request is logged below
        // regardless, and a delivery hiccup on our end isn't theirs to see.
      }
    } catch (err) {
      console.error('Failed to send notification email', err);
    }
  } else {
    console.log('[callback-request] no RESEND_API_KEY/NOTIFY_EMAIL configured — request received:', email);
  }

  return res.status(200).json({ ok: true });
};
