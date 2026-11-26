# Deploying NCK Agro (www.nitai.shop)

Step-by-step guide to put the site live on **Vercel** with the **Supabase** database,
**Razorpay** payments and **SMS login codes**. Follow it in order. Nothing here
needs code changes.

> Secrets (passwords, keys) go **only** into `.env.local` on your computer and into
> Vercel → Settings → Environment Variables. Never paste them into chat, email or Git.

---

## 0. Accounts and monthly costs (decide first)

| Service | Plan | Why | Approx. cost |
|---|---|---|---|
| Vercel | **Pro** | Hobby is for non-commercial use only; Pro allows the order-cleanup job every 15 min | US$20 / month |
| Supabase | **Pro** (recommended) | Free projects pause after a week without traffic and have no daily backups | US$25 / month |
| Razorpay | Standard | Payments; needs KYC for live mode | ~2% per payment, no monthly fee |
| SMS login codes | MSG91 (or Twilio) | Sends the 6-digit login code | MSG91 ≈ ₹0.20–0.30 per SMS + DLT registration |
| Upstash Redis | Free tier | Shared rate limiting across servers (optional but recommended) | Free for this traffic |
| Domain | nitai.shop | Already owned | — |

### SMS provider (needed before customers can log in)
Indian SMS needs **DLT registration** (takes a few days):
1. Register your business as a "Principal Entity" on a DLT portal (e.g. Jio TrueConnect, Vodafone Vi, Airtel).
2. Register a **sender ID** (e.g. `NCKAGR`) and an **OTP template**, for example:
   `Your NCK Agro login code is {#var#}. It expires in 10 minutes. Do not share it.`
3. In MSG91: add the DLT entity, sender ID and template → create an **OTP template** → note the **Template ID** and your **Auth key**.

### Razorpay live mode
Razorpay Dashboard → Account & Settings → complete KYC (PAN, GST, bank account,
business proof). Razorpay checks that the website has the policy pages — they are at
`/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/contact`. **Read them
and correct anything that does not match how you work** (delivery times, refund
rules) before submitting KYC. Fill in Admin → Settings (business address, phone,
email) first — those pages show it.

---

## 1. Prepare the database (once)

The database already has all migrations applied (2026-11-25). To check:

```bash
npm run db:status          # should list 3 migrations as "applied" and say "Database is up to date."
npm run db:backup          # saves a full copy to backups/ (do this before every release)
```

**Connection string for Vercel:** Supabase → *Connect* → **Transaction pooler** (port **6543**).
Put it in `.env.local` as `DATABASE_URL`, then run `npm run check-env` — it should say
*"Supabase transaction pooler (good for Vercel); region: …"*. Note the region.

If you pasted the database password anywhere (chat, email), first reset it:
Supabase → Project Settings → Database → *Reset database password*, then update `DATABASE_URL`.

**Admin access:** `npm run admin:list` shows who is an admin (numbers masked).
To add one: `npm run admin:grant -- 98XXXXXXXX`, then log in on the site with that number.

---

## 2. Create the secrets

Run each line once and keep the outputs for step 3:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # CRON_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # RAZORPAY_WEBHOOK_SECRET
```

Keep `SESSION_SECRET` the same forever — changing it logs everybody out.

---

## 3. Vercel settings

Vercel → your `nitai.shop` project → **Settings**.

### Environment Variables
Add these for the **Production** environment (names are listed in `.env.example`):

| Name | Value |
|---|---|
| `APP_URL` | `https://www.nitai.shop` |
| `DATABASE_URL` | Supabase transaction pooler URI (port 6543) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → API Keys → **Secret key** (`sb_secret_…`) |
| `SESSION_SECRET` | from step 2 |
| `CRON_SECRET` | from step 2 |
| `RAZORPAY_KEY_ID` | `rzp_live_…` |
| `RAZORPAY_KEY_SECRET` | live key secret |
| `RAZORPAY_WEBHOOK_SECRET` | from step 2 (also entered in Razorpay, step 4) |
| `OTP_PROVIDER` | `msg91` |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | from MSG91 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional, from Upstash |

**Delete the old variables** the previous version used: `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`ADMIN_PASSWORD`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.

For **Preview** deployments (to test before going live) use the same names but:
`APP_ENV=staging`, Razorpay **test** keys (`rzp_test_…`), and `APP_URL` = the preview URL.
With `APP_ENV=staging`, `OTP_PROVIDER=console` is allowed: login codes then appear in
Vercel → Logs instead of by SMS (handy before SMS is approved).

> The server **refuses to start in production** if anything required is missing or
> unsafe (test payment key, `console` login codes, http URL…). The reason is in
> Vercel → Logs as `config_error`. Run `npm run check-env -- --prod` locally to check.

### Functions region
Settings → Functions → **Function Region**: choose the one closest to your Supabase
region (Supabase → Project Settings → General). E.g. Supabase `ap-south-1` (Mumbai) →
Vercel **Mumbai (bom1)**; Supabase `ap-southeast-1` (Singapore) → **Singapore (sin1)**.

### Cron job
`vercel.json` runs `/api/cron/expire-orders` once a day (works on every plan). It cancels
checkouts that were never paid and deletes old login codes. **On Vercel Pro**, change the
schedule in `vercel.json` to every 15 minutes: `"schedule": "*/15 * * * *"`.

---

## 4. Razorpay webhook

Razorpay Dashboard (**Live** mode) → Account & Settings → **Webhooks** → Add new webhook:

- URL: `https://www.nitai.shop/api/payment/webhook`
- Secret: the `RAZORPAY_WEBHOOK_SECRET` from step 2
- Events: **payment.captured**, **payment.failed**, **order.paid**

The webhook confirms an order even if the customer closes the browser right after paying.
Do the same in **Test** mode with the preview URL if you test on a preview deployment.

---

## 5. Release

1. `npm run db:backup`
2. Merge the `production-readiness` branch into `main` (pull request on GitHub). CI must be green.
3. Vercel deploys `main` to production automatically. Wait for "Ready".

---

## 6. Checks right after going live (10 minutes)

| # | Check | Expected |
|---|---|---|
| 1 | Open https://www.nitai.shop | Home page with your products |
| 2 | Vercel → Logs, filter `config_` | `config_ok` (no `config_error`) |
| 3 | Log in with your phone | SMS code arrives; you are logged in |
| 4 | Open `/admin` | Admin dashboard (if your number is an admin) |
| 5 | Admin → Products → edit a product, upload an image | Image shows on the product |
| 6 | Admin → Settings | Business name, address, phone, email filled in; store **Open** |
| 7 | Place a real order for a cheap item, pay by UPI | "Thank you! Your order is placed." Order shows in Admin → Orders with a NEW badge |
| 8 | Razorpay → Payments | The payment is **captured**; then **refund** it from Razorpay if it was only a test |
| 9 | Razorpay → Webhooks → your webhook | Recent deliveries succeeded (200) |
| 10 | `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/contact` | Pages open and show your details |

From your computer you can also run `npm run storage:smoke` (image upload check).

---

## 7. If something goes wrong (rollback)

- **Website problem after a release:** Vercel → Deployments → pick the previous good
  deployment → **⋯ → Instant Rollback**. Takes seconds; the database is not touched.
- **Payments failing:** check Vercel Logs for `razorpay_` errors. A payment that reaches
  Razorpay is matched to its order by the webhook even if the customer's browser closed
  (also after the 30-minute payment window — the order is then revived). If you ever see a
  captured payment in Razorpay with no confirmed order, refund it from the Razorpay dashboard.
- **Store must stop taking orders** (stock issue, holiday): Admin → Settings → Store status
  **Closed** with a message. Browsing still works.
- **Database restore** (last resort): backups made with `npm run db:backup` are in
  `backups/`. Supabase Pro also keeps daily backups (Supabase → Database → Backups).
  Ask a developer before restoring — it overwrites newer orders.

Every error shown to a customer has a reference id; search for it in Vercel → Logs.
Useful log messages: `unhandled_error`, `payment_signature_invalid`,
`webhook_payment_not_confirmed`, `otp_send_failed`, `storage_upload_failed`.

---

## 8. Routine

- Before each release: `npm run db:backup`.
- Weekly: Admin → Orders → check nothing is stuck in "Payment pending".
- Keep the policy pages up to date when your delivery or refund rules change
  (`src/app/*-policy/page.tsx`, `src/app/terms`, `src/app/privacy`).
