# NCK Agro — B2B agro-inputs store (www.nitai.shop)

Online ordering for pesticides, fungicides, herbicides and fertilisers for retailers,
dealers and farmers: catalogue with pack sizes and box (bulk) pricing, OTP login,
cart, Razorpay payments (prepaid or Cash on Delivery with an online advance), order
tracking, and an admin panel for products, brands, banners, orders, customers,
analytics and store settings.

**Going live?** Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
Current state and plan: [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Tech stack

- Next.js 16 (App Router; see `AGENTS.md` — APIs differ from older versions), React 19, Tailwind 4, TypeScript
- PostgreSQL on Supabase, accessed **only from the server** (`postgres` driver); Row Level Security blocks direct browser access
- Supabase Storage for images (uploaded through the server)
- Razorpay (REST API) — server-side pricing, signature + payment verification, webhook
- OTP login by SMS (MSG91 or Twilio Verify; `console` in development), httpOnly session cookie
- Vitest + PGlite (in-memory Postgres) for API tests; Playwright for browser tests

## Getting started (development)

```bash
npm install
cp .env.example .env.local      # then fill in values (see comments in the file)
npm run check-env               # shows which settings are present (never prints values)
npm run dev                     # http://localhost:3000
```

With `OTP_PROVIDER=console` the 6-digit login code is printed in the terminal.
Make yourself an admin with `npm run admin:grant -- <your mobile>`, log in, open `/admin`.

> `npm run dev` uses the database in `DATABASE_URL` — usually the **real** one.
> To try things safely use the sandbox below.

### Sandbox (safe playground)

```bash
npm run sandbox                 # http://localhost:3100
```

A private copy of the shop with demo products and an in-memory database that is thrown
away when you stop it. Payments use your Razorpay **test** keys from `.env.local`
(UPI `success@razorpay` or Razorpay test cards; live keys are refused). Admin login:
`9000000001`; codes appear in the terminal.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server / production build / run the build |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | API and database tests (in-memory Postgres, fake Razorpay) |
| `npm run test:e2e` | Build, then browser tests (mobile + desktop) against an isolated copy |
| `npm run sandbox` | Safe playground (see above) |
| `npm run check-env` (`-- --prod`) | Which variables are set; production rules with `--prod` |
| `npm run db:status` / `db:migrate` | Show / apply database migrations (`supabase/migrations`) |
| `npm run db:backup` | Full database backup into `backups/` |
| `npm run admin:list` / `admin:grant -- <phone>` / `admin:revoke -- <phone>` | Manage admin access |
| `npm run storage:smoke` | Upload/delete a test image in the real storage bucket |

On Windows, run the tests from a normal terminal (PowerShell or cmd). Vitest can fail
to start in shells that report the drive letter in lower case.

## Project structure

```
src/
  app/                 pages (storefront, /admin, policy pages) and API routes (app/api/**)
  components/          UI components
  context/             client state: auth, cart, wishlist, store settings, language
  lib/                 code shared by browser and server: validation (zod), money, phone, statuses
  server/              server-only code: env, db, auth (OTP, sessions), orders, payments,
                       catalog, cart, storage, admin queries, rate limits, logging
  instrumentation.ts   refuses to start in production with missing/unsafe settings
supabase/migrations/   versioned SQL migrations (applied by npm run db:migrate)
scripts/               env check, migrations, backup, admin, sandbox/E2E server, storage check
tests/                 Vitest API tests; tests/e2e = Playwright browser tests
docs/DEPLOYMENT.md     how to deploy, check and roll back
```

## How key things work

- **Prices are always calculated on the server.** The browser sends product, pack and box
  choice; the server computes the amount (in paise) and creates the Razorpay order.
- **An order is placed only after payment is verified**: signature check *and* fetching the
  payment from Razorpay (amount, currency, status). The webhook confirms payments if the
  customer's browser closes; checkouts not paid within 30 minutes are cancelled by the cron job.
- **Login**: one-time code by SMS, stored hashed, 5 attempts, rate limited per phone and per IP.
  Sessions are random tokens in an httpOnly cookie; only their hash is stored.
- **Admin** pages and APIs require `users.is_admin`; every admin change is logged (shown under Admin → Settings).
- **Security**: CSRF origin checks on all state-changing requests, Content-Security-Policy and
  other security headers, request-size limits, generic error messages with a reference id.

## Database changes

Add a new file `supabase/migrations/YYYYMMDDHHMMSS_description.sql`, run `npm test`
(the migration tests apply every file to a fresh database), back up, then `npm run db:migrate`.
Never edit a migration that is already applied — the checksum check will refuse it.
