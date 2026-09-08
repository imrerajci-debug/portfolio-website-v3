// Serverless contact-form handler (Netlify Functions).
//
// Responsibilities:
//   - Validate the submission (honeypot, field lengths, email format)
//   - Verify the Cloudflare Turnstile token server-side (never trust the client)
//   - Apply best-effort persistent rate limiting (see checkRateLimit below)
//   - Send the message via Resend, using only server-side environment variables
//
// The destination email address and every secret used here live in Netlify's
// environment variables (Site settings -> Environment variables). None of them
// are ever sent to the browser or written to a log.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, 'error-codes': ['missing-secret-config'] };
  }
  const body = new URLSearchParams();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
  return res.json();
}

// Netlify Functions run on-demand with no shared memory between invocations,
// so an in-process counter is not a real rate limiter — it resets constantly
// and gives false confidence. This only enforces a limit when a persistent
// store is configured (Upstash Redis free tier: https://upstash.com), and is
// a documented no-op otherwise. See README.md "Rate limiting" for the two
// supported ways to make this a hard requirement instead of best-effort.
async function checkRateLimit(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !ip) {
    return { allowed: true, enforced: false };
  }
  try {
    const key = `contact-rl:${ip}`;
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const incrData = await incrRes.json();
    const count = incrData && incrData.result;
    if (count === 1) {
      await fetch(`${url}/expire/${encodeURIComponent(key)}/600`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return { allowed: typeof count === 'number' ? count <= 3 : true, enforced: true };
  } catch (err) {
    // Fail open: an unreachable rate-limit store should not block real users.
    return { allowed: true, enforced: false };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method-not-allowed' });
  }

  if (event.body && event.body.length > 10000) {
    return jsonResponse(413, { ok: false, error: 'payload-too-large' });
  }

  const expectedOrigin = process.env.SITE_URL;
  const origin = event.headers.origin || event.headers.Origin;
  if (expectedOrigin && origin && origin !== expectedOrigin) {
    return jsonResponse(403, { ok: false, error: 'bad-origin' });
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { ok: false, error: 'invalid-json' });
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';
  const honeypot = typeof data.company === 'string' ? data.company : '';
  const turnstileToken = typeof data.turnstileToken === 'string' ? data.turnstileToken : '';

  // Honeypot: a real visitor never sees or fills this field.
  if (honeypot) {
    return jsonResponse(400, { ok: false, error: 'invalid-submission' });
  }

  if (name.length < 2 || name.length > 80) {
    return jsonResponse(400, { ok: false, error: 'invalid-name' });
  }
  if (!isValidEmail(email)) {
    return jsonResponse(400, { ok: false, error: 'invalid-email' });
  }
  if (message.length < 10 || message.length > 3000) {
    return jsonResponse(400, { ok: false, error: 'invalid-message' });
  }
  if (!turnstileToken) {
    return jsonResponse(400, { ok: false, error: 'missing-turnstile-token' });
  }

  const ip =
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    '';

  const rateLimit = await checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return jsonResponse(429, { ok: false, error: 'rate-limited' });
  }

  let verification;
  try {
    verification = await verifyTurnstile(turnstileToken, ip);
  } catch (err) {
    return jsonResponse(502, { ok: false, error: 'turnstile-unreachable' });
  }

  if (!verification || !verification.success) {
    return jsonResponse(403, { ok: false, error: 'turnstile-failed' });
  }

  const expectedHostname = process.env.SITE_HOSTNAME;
  if (expectedHostname && verification.hostname && verification.hostname !== expectedHostname) {
    return jsonResponse(403, { ok: false, error: 'turnstile-hostname-mismatch' });
  }

  const expectedAction = process.env.TURNSTILE_ACTION;
  if (expectedAction && verification.action && verification.action !== expectedAction) {
    return jsonResponse(403, { ok: false, error: 'turnstile-action-mismatch' });
  }

  const recipient = process.env.CONTACT_TO_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (!recipient || !resendKey) {
    // Server is missing required configuration — fail closed, never fall back
    // to exposing the address or sending through an unconfigured channel.
    return jsonResponse(500, { ok: false, error: 'server-misconfigured' });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>',
        to: [recipient],
        reply_to: email,
        subject: `New message from ${safeName} via portfolio`,
        html:
          `<p><strong>Name:</strong> ${safeName}</p>` +
          `<p><strong>Email:</strong> ${safeEmail}</p>` +
          `<p><strong>Message:</strong></p><p>${safeMessage}</p>`,
      }),
    });

    if (!emailRes.ok) {
      return jsonResponse(502, { ok: false, error: 'email-send-failed' });
    }
  } catch (err) {
    return jsonResponse(502, { ok: false, error: 'email-send-failed' });
  }

  return jsonResponse(200, { ok: true });
};
