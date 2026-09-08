# Portfolio site

Static, hand-authored HTML/CSS/JS — no framework, no build step, no bundler.
Each page (`index.html`, `hertz-minilease.html`, etc.) is fully self-contained.
The one exception is the contact form on `index.html`, which submits to a
Netlify serverless function so the destination email address and all
credentials never reach the browser.

## Local preview

`serve-main.ps1` runs a tiny PowerShell static file server (no Node/npm
required) on `http://localhost:8993`. It cannot run the serverless function —
use the Netlify CLI (`netlify dev`) if you need to test the contact form
end-to-end locally.

## Deploying (Netlify)

1. Push this folder to a Git repository (Netlify Drop does not run
   serverless functions from a plain folder upload — a connected Git repo,
   or `netlify deploy` via the Netlify CLI, is required so Netlify can build
   and deploy `netlify/functions/contact.js`).
2. In the Netlify dashboard, "Add new site" -> connect the repository.
   Build command: none. Publish directory: `.` (already set in
   `netlify.toml`).
3. Site settings -> Environment variables -> add every variable listed in
   `.env.example` with real values (see below for where each one comes
   from).
4. Redeploy. The form posts to `/api/contact`, which `netlify.toml` routes
   to the function.

## Required services

### Cloudflare Turnstile (bot protection)

1. https://dash.cloudflare.com/?to=/:account/turnstile -> Add a site.
2. Widget mode: **Managed**. Appearance: **Interaction Only** (already set
   via `data-appearance="interaction-only"` on the widget in `index.html`,
   so it stays invisible unless Cloudflare decides a challenge is needed).
3. Copy the **Site Key** into `index.html`, replacing the placeholder
   `YOUR_TURNSTILE_SITE_KEY` on the `.cf-turnstile` div. Site keys are
   public by design — this is safe to commit.
4. Copy the **Secret Key** into Netlify's `TURNSTILE_SECRET_KEY` environment
   variable only. Never put it in any HTML/JS file.

### Resend (email delivery)

1. https://resend.com -> create an account, verify a sending domain (or use
   the default `onboarding@resend.dev` sender while testing).
2. Create an API key -> put it in Netlify's `RESEND_API_KEY`.
3. Set `CONTACT_TO_EMAIL` to the inbox that should receive messages, and
   `CONTACT_FROM_EMAIL` to a verified sender address once you have a
   verified domain.

### Site identity

Set `SITE_URL` (e.g. `https://www.example.com`) and `SITE_HOSTNAME` (e.g.
`www.example.com`) once the site has a real domain. The function uses these
to reject requests from other origins and to confirm the Turnstile token was
issued for this hostname. Leave them unset during early testing — the checks
are skipped (not failed open to "always trust", just not enforced) when the
variable is empty.

## Rate limiting

Netlify Functions are stateless and short-lived — nothing persists between
invocations, so an in-process counter is not a real rate limiter and isn't
used here. `netlify/functions/contact.js` supports an optional persistent
limiter via [Upstash Redis](https://upstash.com) (free tier: 10k
commands/day, no credit card): set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` and it activates automatically (3 submissions per
10 minutes per IP). Without those two variables set, rate limiting is a
documented no-op — either add Upstash, or enable Netlify's own Rate
Limiting feature (currently Team/Enterprise plans) and point it at
`/api/contact`.

## Security notes

- The destination email, Turnstile secret, and Resend API key exist only as
  Netlify environment variables, read via `process.env` inside the
  function. They are never interpolated into HTML/JS served to the browser.
- User-submitted content is HTML-escaped before being placed in the
  notification email.
- The function never logs form contents, email addresses, or secrets.
- A hidden honeypot field (`company`) and server-side length limits
  (name 2–80, email ≤254, message 10–3000 chars) reject spam and malformed
  submissions before Turnstile is even checked.

## Remaining public personal-data exposure

See the end of the implementation summary in the conversation this was
built from. As of this change, the public HTML source contains no email
address, phone number, or exact street address — only "Uster, Switzerland"
and a LinkedIn link. **The LinkedIn URL in `index.html` is currently a
placeholder** (`https://www.linkedin.com/in/REPLACE-WITH-YOUR-LINKEDIN`) —
replace it with the real profile URL before publishing.
