# NCK Agro — B2B Pesticide Distribution Platform

A Next.js 14 B2B platform for agricultural product distribution with admin panel, company management, bulk pricing, and product discovery features.

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/jungo876/nitai.shop.git
cd nitai.shop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory (get values from the project owner):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_WHATSAPP_NUMBER=your_whatsapp_number
```

### 4. Set up the database

Run the SQL files in your Supabase SQL editor **in this order**:

1. `supabase/setup.sql` — Creates all base tables (`companies`, `products`, `product_variants`, `bulk_prices`)
2. `supabase/migration_bulk_prices.sql` — Adds bulk pricing support + `is_top_selling` column

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Admin panel: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── admin/          # Admin panel (company + product management)
│   ├── api/
│   │   ├── companies/  # CRUD for companies
│   │   ├── products/   # CRUD for products (search, pagination, top_selling filter)
│   │   └── upload/     # Image upload endpoint
│   ├── company/[id]/   # Dynamic company product page
│   └── page.tsx        # Homepage (search, top selling, companies, all products)
├── components/
│   ├── BulkPricingSelector.tsx
│   ├── HeroCarousel.tsx
│   └── ProductCard.tsx
└── lib/
    ├── supabase.ts
    └── types.ts
```

---

## ✨ Features

- **Homepage**: Hero carousel, sticky search bar, Top Selling section, Browse by Company, All Products with pagination
- **Company Pages**: `/company/[id]` — shows all products for a company
- **Admin Panel**: Sticky navbar with search, company management (logo upload), product management (variants, bulk pricing, top selling toggle)
- **Search**: API supports `?search=keyword` with name, category, and company name filtering
- **Pagination**: `?limit=10&offset=0` with "See More" append loading

---

## 🔑 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (supports `?search=`, `?top_selling=true`, `?limit=`, `?offset=`, `?company_id=`) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/[id]` | Update product |
| DELETE | `/api/products/[id]` | Delete product |
| GET | `/api/companies` | List all companies |
| POST | `/api/companies` | Create company |
| DELETE | `/api/companies/[id]` | Delete company |
| POST | `/api/upload` | Upload image → Supabase Storage |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
