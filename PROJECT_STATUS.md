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

## 2. Where we are / next step  (PAUSED 2026-11-25, ~60% done)

**Done:** DB backed up + migrations 001-003 applied to Supabase (verified locked down);
secure backend (OTP login, sessions, verified Razorpay payments, webhook, server
pricing, admin APIs); storefront + admin UI rewired (commit f7ffc9c). 53 tests pass,
0 lint errors, production build passes.

**In progress (uncommitted work committed as WIP):** browser end-to-end tests.
Written: scripts/e2e-server.mjs (isolated site: PGlite DB + fake Razorpay + next start),
scripts/lib/seed-data.mjs, scripts/lib/razorpay-mock.mjs. Playwright + Chromium installed.

**Resume here, in order:**
1. playwright.config.ts + tests/e2e/*.spec.ts (browse, OTP login, profile, cart,
   prepaid + COD checkout via fake checkout.js route, admin order handling,
   store-closed, non-admin blocked); add `test:e2e` script; run and fix bugs found.
2. Policy pages (Terms, Privacy, Refund/Cancellation, Shipping, Contact) + Footer links;
   not-found.tsx / error.tsx.
3. Security headers/CSP in next.config.ts (allow checkout.razorpay.com), poweredByHeader off;
   src/instrumentation.ts calling productionConfigProblems().
4. Real storage upload smoke test with the new secret key; delete test file.
5. .env.example, README, docs/DEPLOYMENT.md (rollback, post-deploy checks), vercel.json
   (cron for /api/cron/expire-orders, region), CI workflow, .gitattributes (LF).
6. Final production-readiness audit; then ask owner before pushing/deploying.

## 3. Decisions

### Owner decisions (2026-11-25)
| Topic | Decision |
|---|---|
| Database | OK to apply migrations to the existing Supabase project and create/delete test users/orders. Back up first; never delete products/brands. |
| Login verification | Build phone-OTP login with pluggable providers; dev mode logs the code. **Owner picks the SMS/WhatsApp provider before launch.** |
| GST invoices | **Undecided** — open launch item (site text currently promises GST invoices). |
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

### Phase 0 — Safety & baseline
- ✅ Snapshot of 2 months of uncommitted work committed on branch `production-readiness`
- ✅ Security upgrades: Next 16.2.4 → 16.4.6, React 19.2.9, Zod 4.6.7 (`npm audit`: 11 → 0 vulnerabilities)
- ✅ Production build fixed (missing type import) — `next build` passes
- ✅ `npm run check-env` — reports configured variables without printing secrets

### Phase 1 — Critical architecture & bugs
- ✅ Reconstruct live DB schema → baseline migration (verified against live DB)
- ✅ Migration runner (`npm run db:migrate`, `db:status`) + backup (`npm run db:backup`)
- ✅ Security/integrity migration: sessions, OTP, constraints, FKs, status names, order snapshots, RLS lockdown — **applied to Supabase**
- ✅ Server foundation: env, db client, logger, HTTP helpers (errors, CSRF origin check, body limits), rate limits
- ✅ Auth API: OTP request/verify, DB sessions, logout, guards; insecure login + admin-password routes removed
- ✅ Cart API: tier/variant/box-count/status validation, ownership checks, paise pricing
- ✅ Checkout & payments API: pending orders, signature + Razorpay fetch verification, webhook, idempotency, expiry cron
- ✅ Profile setup bound to the logged-in user
- ✅ Product editing updates variants/tiers in place, in a transaction
- ✅ Admin APIs: orders, stats, analytics, customers, settings, activity, export, upload
- ✅ Admin "Paid" bug, CSV export, dev-tools reset fixed (API side)
- ⬜ Frontend wired to the new APIs (in progress)
- ⬜ Remove fake data (purchase ticker, random "low stock", invented funnel)

### Phase 2 — Essential missing features
- ⬜ OTP login UI (phone → code, resend timer)
- ⬜ Order numbers; "new order" badge in admin
- ⬜ Real store settings (WhatsApp/support contacts, store open/closed)
- ⬜ `/companies` page (fixes broken "Explore All" link)
- ⬜ Policy pages required by Razorpay: Terms, Privacy, Refund & Cancellation, Shipping & Delivery, Contact
- ⬜ 404 and error pages
- ⬜ Admin categories page (real) — reviews placeholder hidden
- ⬜ Expire unpaid pending orders (scheduled job)

### Phase 3 — Integration with the real database
- ✅ Back up live database
- ✅ Apply migrations to Supabase (001–003)
- ✅ Lock down storage bucket policies (anonymous uploads denied — verified); ⬜ uploads via secret key in new code
- ⏸ Smoke test against real DB + Razorpay test mode

### Phase 4 — Security hardening
- ⬜ Security headers / CSP
- ⬜ Rate limits (DB-based for OTP; Upstash optional elsewhere)
- ⬜ Upload validation by file signature
- ⬜ Safe redirects; banner link validation
- ⬜ No internal errors/PII in responses or logs
- ⬜ Route-by-route authorization review

### Phase 5 — Testing & QA
- ✅ Integration + API route tests (PGlite + mock Razorpay): 53 passing · ⬜ more unit tests
- ⬜ End-to-end tests (Playwright): browse → login → cart → checkout → admin
- ⬜ Lint clean · ✅ typecheck · ✅ production build

### Phase 6 — Performance & reliability
- ⬜ Remove N+1 queries · ⬜ Health endpoint · ⬜ Image optimisation · ⬜ Loading/error states

### Phase 7 — Deployment preparation
- ⬜ `.env.example`, README, `docs/DEPLOYMENT.md` (rollback + post-deploy checks)
- ⬜ `vercel.json` (cron, region) · ⬜ CI workflow · ⬜ Final production-readiness audit

## 5. Owner to-do list

| # | Item | Needed for | Status |
|---|---|---|---|
| 1 | Add `DATABASE_URL` and `SUPABASE_SECRET_KEY` to `.env.local` | Phase 3 | ✅ done — but **reset the DB password** (it was pasted in chat) and switch to the Transaction pooler URL |
| 2 | Choose SMS/WhatsApp OTP provider; start DLT registration if SMS | Launch | ⏸ waiting (lead time: days) |
| 3 | Razorpay live-mode activation (KYC) | Launch | ⏸ waiting (lead time: days) |
| 4 | Hosting budget: Supabase Pro (free tier pauses), Vercel Pro (Hobby is non-commercial) | Launch | ⏸ decision |
| 5 | Domain | Launch | ✅ `nitai.shop` |
| 6 | Review policy page texts (Terms, Privacy, Refund, Shipping) | Launch | ⬜ after Phase 2 |
| 7 | Enter real products, prices and images; delete test products | Launch | ⬜ |
| 8 | Decide on GST invoices | Launch | ⏸ decision |

## 6. Known issues (current code)

Critical (being fixed in Phase 1): phone-only login without verification;
session cookie is the raw phone number; database writable with the public anon
key; payments not verified; client can choose bulk price; profile IDOR.
Other: see the audit summary in git history / Phase 1 checklist.

The live site `www.nitai.shop` runs an **old version** (pre-May) against the
same database. It will be replaced when the new version is deployed.

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
