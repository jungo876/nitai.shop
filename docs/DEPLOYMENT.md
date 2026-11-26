# Deploying NCK Agro (www.nitai.shop)

Step-by-step guide to put the site live on **Netlify** (free plan) with the **Supabase**
database (free plan), **Razorpay** payments and **SMS login codes**. Follow it in order.
Nothing here needs code changes. (Vercel works too — see the end.)

> Secrets (passwords, keys) go **only** into `.env.local` on your computer and into
> Netlify → Environment variables. Never paste them into chat, email or Git.

---

## 0. Accounts and costs

| Service | Plan | Notes | Cost |
|---|---|---|---|
| Netlify | **Free** | Business use allowed. 300 credits/month (see below) | ₹0 |
| Supabase | **Free** | Business use allowed; 500 MB database, 1 GB images. No automatic backups → run `npm run db:backup` weekly | ₹0 |
| Razorpay | Standard | Needs KYC for live mode | ~2% per payment |
| SMS login codes | MSG91 (or Twilio) | Needs DLT registration | ≈ ₹0.20–0.30 per code |
| Upstash Redis | Free | Optional: shared rate limiting | ₹0 |
| Domain | nitai.shop | Already owned (GoDaddy) | — |

### Netlify credits — read this
The free plan has **300 credits a month**. **If they run out, Netlify shows "Site not
available" until the next month.** What uses credits:

- **Each production deploy: 15 credits.** Previews of other branches are free.
  `netlify.toml` skips builds when only docs/tests change. Batch changes: ~5 deploys a month = 75.
- **Traffic: 20 credits per GB.** A few hundred visits ≈ 0.5–1 GB ≈ 10–20 credits.
- **Server work: 10 credits per GB-hour** (logins, cart, orders, the hourly cleanup) — a few credits at this size.

Expected: **~80–150 credits/month**. Check **Netlify → Team → Usage & billing** weekly.
When the shop grows, Netlify Pro (~US$20/month) removes the worry.

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

**Connection string:** Supabase → *Connect* → **Transaction pooler** (port **6543**).
Put it in `.env.local` as `DATABASE_URL`, then run `npm run check-env` — it should say
*"Supabase transaction pooler (good for Vercel); region: …"* (same for Netlify).

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

## 3. Create the Netlify site

1. Sign up at netlify.com (free) with your GitHub account.
2. **Add new project → Import an existing project → GitHub → `jungo876/nitai.shop`.**
3. **Branch to deploy:** `main` (after step 5's merge). To try the new version first,
   pick `production-readiness`; switch to `main` later in Project configuration → Build & deploy → Branches.
4. Build settings are read from `netlify.toml` — leave them as they are.
5. **Before the first deploy, add the environment variables** (button on the same screen,
   or later in Project configuration → Environment variables). Mark secrets as **secret**:

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

**Trying it before SMS and Razorpay KYC are ready?** Add `APP_ENV=staging`, use Razorpay
**test** keys and `OTP_PROVIDER=console`. Login codes then appear in Netlify → Logs →
Functions instead of by SMS. Change these back before real customers use the site.

> The server **refuses to start in production** if anything required is missing or
> unsafe (test payment key, `console` login codes, http URL…) and shows an error page.
> The reason is in Netlify → Logs → Functions as `config_error`.
> Run `npm run check-env -- --prod` locally to check first.

6. Deploy. When it says **Published**, open the `https://<name>.netlify.app` address and
   check the shop works (step 6's list) **before** moving the domain.

### Functions region (speed)
Netlify runs the server part in the USA (Ohio) by default. Your database is in Supabase's
region (Supabase → Project Settings → General). If Netlify lets you choose (Project
configuration → Build & deploy → Functions region), pick the closest one (Mumbai or
Singapore) and redeploy. If the free plan doesn't allow it, the site still works but pages
that load data are somewhat slower (each database query travels to the USA and back).

### Hourly cleanup job
`netlify/functions/expire-orders.mts` runs every hour on Netlify automatically. It cancels
checkouts not paid within 30 minutes and deletes old login codes. You can see it under
Netlify → Logs → Functions → `expire-orders`. (`vercel.json` is only used on Vercel.)

---

## 4. Move the domain (www.nitai.shop) to Netlify

Do this only after the `.netlify.app` address works.

1. Netlify → Domain management → **Add a domain** → `www.nitai.shop` (also add `nitai.shop`).
2. GoDaddy → nitai.shop → **DNS**:
   - Change the `www` **CNAME** to `<your-site>.netlify.app`
   - Change the `@` **A** record to the IP Netlify shows you (Netlify's load balancer)
   - Remove the old Vercel records (`cname.vercel-dns.com`, `76.76.21.21`)
3. Wait up to a few hours. Netlify adds the free HTTPS certificate automatically.
4. Then remove the domain from the old Vercel project (or delete that project).

---

## 5. Razorpay webhook

Razorpay Dashboard (**Live** mode) → Account & Settings → **Webhooks** → Add new webhook:

- URL: `https://www.nitai.shop/api/payment/webhook`
- Secret: the `RAZORPAY_WEBHOOK_SECRET` from step 2
- Events: **payment.captured**, **payment.failed**, **order.paid**

The webhook confirms an order even if the customer closes the browser right after paying.

---

## 6. Release

1. `npm run db:backup`
2. Merge `production-readiness` into `main` (pull request on GitHub). The CI check must be green.
3. Netlify builds `main` and publishes it automatically (15 credits).

### Checks right after going live (10 minutes)

| # | Check | Expected |
|---|---|---|
| 1 | Open https://www.nitai.shop | Home page with your products |
| 2 | Netlify → Logs → Functions, search `config_` | `config_ok` (no `config_error`) |
| 3 | Log in with your phone | SMS code arrives; you are logged in |
| 4 | Open `/admin` | Admin dashboard (if your number is an admin) |
| 5 | Admin → Products → edit a product, upload an image | Image shows on the product |
| 6 | Admin → Settings | Business name, address, phone, email filled in; store **Open** |
| 7 | Place a real order for a cheap item, pay by UPI | "Thank you! Your order is placed." Order shows in Admin → Orders with a NEW badge |
| 8 | Razorpay → Payments | The payment is **captured**; **refund** it from Razorpay if it was only a test |
| 9 | Razorpay → Webhooks → your webhook | Recent deliveries succeeded (200) |
| 10 | `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy`, `/contact` | Pages open and show your details |
| 11 | Next hour: Logs → Functions → `expire-orders` | `HTTP 200` |

From your computer you can also run `npm run storage:smoke` (image upload check).

---

## 7. If something goes wrong (rollback)

- **Website problem after a release:** Netlify → Deploys → pick the previous good deploy →
  **Publish deploy**. Takes seconds and uses no credits; the database is not touched.
- **"Site not available":** the monthly credits ran out — see Usage & billing. Wait for the
  next month or upgrade to Pro.
- **Payments failing:** check the function logs for `razorpay_` errors. A payment that reaches
  Razorpay is matched to its order by the webhook even if the customer's browser closed
  (also after the 30-minute payment window — the order is then revived). If you ever see a
  captured payment in Razorpay with no confirmed order, refund it from the Razorpay dashboard.
- **Store must stop taking orders** (stock issue, holiday): Admin → Settings → Store status
  **Closed** with a message. Browsing still works.
- **Database restore** (last resort): backups made with `npm run db:backup` are in
  `backups/`. Ask a developer before restoring — it overwrites newer orders.

Every error shown to a customer has a reference id; search for it in the function logs.
Useful log messages: `unhandled_error`, `payment_signature_invalid`,
`webhook_payment_not_confirmed`, `otp_send_failed`, `storage_upload_failed`.

---

## 8. Routine

- **Weekly:** `npm run db:backup` (Supabase Free has no automatic backups) and check
  Netlify credits (Team → Usage & billing).
- Weekly: Admin → Orders → check nothing is stuck in "Payment pending".
- Keep the policy pages up to date when your delivery or refund rules change
  (`src/app/*-policy/page.tsx`, `src/app/terms`, `src/app/privacy`).

---

## Using Vercel instead

Everything above applies, except: set the environment variables in Vercel → Settings →
Environment Variables; the cleanup job comes from `vercel.json` (daily on Hobby; change to
`*/15 * * * *` on Pro); choose Settings → Functions → Function Region near Supabase
(e.g. Mumbai `bom1`); roll back via Deployments → Instant Rollback. Note: Vercel's free
Hobby plan is for **non-commercial** use only, so a shop needs Vercel Pro.
