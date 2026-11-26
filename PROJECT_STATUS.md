# NCK Agro — Project Status

> Living document. Updated at every milestone. **If work is interrupted, the
> "Where we are / next step" section tells you exactly where to resume.**

Last updated: 2026-11-25 (evening) · Branch: `production-readiness` (local, not pushed)

---

## 1. What this is

**NCK Agro** (`nitai.shop`) is a B2B ordering website for agricultural inputs
(pesticides, fertilizers, seeds, tools). Retailers/dealers log in with their
phone number, browse products by brand and category, buy in **boxes** with
**bulk-tier pricing**, and pay either **100% online (prepaid)** or a **10%
online advance with the rest on delivery (COD)** via Razorpay. The owner manages
products, brands, banners and orders in an admin panel.

**Goal of the current work:** take the codebase from "working demo" to a secure,
tested, deployable website the business can take real orders on.

## 2. Where we are / next step  (2026-11-26, ~90% done)

**Done:** database migrated + locked down; secure backend; storefront + admin rewired;
browser E2E tests (28, mobile + desktop) with 2 mobile bugs fixed; policy pages + footer +
404/error pages; security headers/CSP + production startup check + guards (no Razorpay
test keys / console OTP in production); real storage upload verified; **real Razorpay
test-mode payment verified end to end** (sandbox); deployment guide, .env.example,
README, vercel.json cron, GitHub CI, `npm run sandbox`, `npm run admin:*`.
Tests: 60 unit/API + 28 E2E passing, 0 lint errors, typecheck + build pass.
Branch `production-readiness` is **local only** (not pushed).

**Resume here:**
6. Final production-readiness audit: route-by-route authorization review, banner link
   validation, health endpoint (optional), `npm audit`, review lint warnings, check
   README/DEPLOYMENT accuracy. Then **ask the owner** before pushing to GitHub (a push
   triggers a Vercel preview build and CI) and before any production deploy.

## 3. Decisions

### Owner decisions (2026-11-25)
| Topic | Decision |
|---|---|
| Database | OK to apply migrations to the existing Supabase project and create/delete test users/orders. Back up first; never delete products/brands. |
| Login verification | Build phone-OTP login with pluggable providers; dev mode logs the code. **Owner picks the SMS/WhatsApp provider before launch.** |
| GST invoices | **Undecided** — open launch item. Checkout no longer promises GST invoices (says the GST number is saved with each order). |
| New-order alerts | Admin dashboard only, with a "new" badge. No email/WhatsApp. |
| Domain | `nitai.shop` (GoDaddy DNS → Vercel; apex redirects to `www.nitai.shop`). |

### Engineering decisions (ADRs)
1. **Server-only database access with a direct Postgres connection** (`postgres`
   driver, `DATABASE_URL` = Supabase pooler). The browser never talks to the
   database. Reasons: real transactions (orders), efficient joins, no reliance on
   the public anon key, testable against a local Postgres. Supabase's REST API is
   locked down (RLS on, no write access for `anon`; read-only for public catalog).
2. **Custom phone-OTP auth with database sessions.** Random 256-bit session token
   in an httpOnly cookie, only its SHA-256 hash stored. OTP codes stored as HMACs,
   5 attempts, 10-minute expiry, DB-enforced send limits. Providers are pluggable
   (`console` for development; production adapters added when the owner picks one).
3. **Payments:** create a *pending order* before payment; confirm only after
   verifying the Razorpay signature **and** fetching the payment from Razorpay
   (amount + status); idempotent confirmation; webhook as a safety net; all money
   computed in integer paise. Razorpay called via its REST API (no SDK → fewer
   vulnerable transitive dependencies, easier to mock in tests).
4. **Migrations** live in `supabase/migrations/*.sql`, applied by
   `scripts/migrate.mjs`, tracked in `public.schema_migrations`. Old ad-hoc SQL
   scripts are kept for reference in `supabase/legacy/`.
5. **Testing:** Vitest for unit + integration tests (PGlite = real Postgres in
   WebAssembly, no Docker needed); Playwright for end-to-end tests against a
   production build with a local database and a mocked Razorpay.

## 4. Checklist

Legend: ✅ done · 🔄 in progress · ⬜ not started · ⏸ blocked on owner

- ✅ Phase 0 — snapshot, security upgrades, build fixed, env checker
- ✅ Phase 1 — migrations (applied to Supabase), server-only DB, OTP sessions, verified payments,
  server pricing, admin APIs, frontend rewired, fake data removed
- ✅ Phase 2 — OTP login UI, order numbers + NEW badge, store settings, /companies, policy pages,
  404/error pages, categories page, unpaid-order expiry + auth data cleanup (cron)
- ✅ Phase 3 — live DB backup + migrations; storage uploads with the secret key (`npm run storage:smoke`);
  Razorpay test mode verified via sandbox · ⏸ live payment check after deploy (owner)
- 🔄 Phase 4 — ✅ CSP/security headers · ✅ rate limits · ✅ upload signature check · ✅ safe redirects ·
  ✅ no PII/internal errors in responses · ✅ production config guard · ⬜ final authorization review
- ✅ Phase 5 — 60 unit/API tests, 28 Playwright tests, lint 0 errors, typecheck, build
- 🔄 Phase 6 — ✅ product list in one query · ✅ error states · ⬜ health endpoint (optional)
- ✅ Phase 7 — .env.example, README, docs/DEPLOYMENT.md, vercel.json, CI, .gitattributes · ⬜ final audit

## 5. Owner to-do list

| # | Item | Needed for | Status |
|---|---|---|---|
| 1 | **Reset the database password** (it was pasted in chat), then put the **Transaction pooler** URI (port 6543) in `.env.local` as `DATABASE_URL` (`npm run check-env` currently reports a *direct* connection) | Launch | ⏸ |
| 2 | Confirm `SUPABASE_SECRET_KEY` is a new key and the one pasted in chat is deleted | Launch | ⏸ |
| 3 | Choose SMS provider (MSG91 suggested) and start DLT registration | Launch | ⏸ (lead time: days) |
| 4 | Razorpay live-mode KYC | Launch | ⏸ (lead time: days) |
| 5 | Hosting budget: Vercel Pro (Hobby is non-commercial), Supabase Pro (recommended) | Launch | ⏸ decision |
| 6 | Fill Admin → Settings (business name, address, phone, email); **review the policy pages** (/terms, /privacy, /refund-policy, /shipping-policy) | Launch / KYC | ⏸ |
| 7 | Enter real products, prices and images; delete test products | Launch | ⏸ |
| 8 | Decide on GST invoices | Launch | ⏸ decision |
| 9 | Approve pushing the branch to GitHub and the production deploy (docs/DEPLOYMENT.md) | Launch | ⏸ |

Try the shop safely any time: `npm run sandbox` → http://localhost:3100 (admin login 9000000001).

## 6. Known issues

- The live site `www.nitai.shop` still runs the **old version** against the same (now
  locked-down) database: browsing works, login/cart/old admin do not. Fixed by deploying.
- 25 lint warnings (no errors), mostly React hook dependency hints in older pages.
- Vitest may fail to start from shells that report a lower-case drive letter (Windows); run
  from PowerShell/cmd.

## 7. Setup (development)

```bash
npm install
npm run check-env      # shows which variables are missing (never prints values)
npm run dev            # http://localhost:3000
npm run typecheck
npm run build
```
(Database, test and seed commands will be added in Phase 1/5.)

## 8. Deployment status

Not deployed. Nothing from this branch has been pushed or deployed.
Deployment requires the owner's explicit approval.
