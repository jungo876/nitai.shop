# NCK Agro — B2B Pesticide Distribution

A modern, mobile-first web application for B2B pesticide distribution with WhatsApp ordering integration.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Image Storage**: Supabase Storage
- **Deployment**: Vercel-ready

## Features

- ✅ **Public Product Catalog** — Browse products with category filtering
- ✅ **WhatsApp Ordering** — One-click order via prefilled WhatsApp messages
- ✅ **Admin Panel** — Add products with image upload
- ✅ **Responsive Design** — Mobile-first, works on all devices
- ✅ **Dark Mode** — Automatic dark mode based on system preference

## Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL from `supabase/setup.sql` in the **SQL Editor**
3. Create a **Storage bucket** called `product-images` and make it **public**
4. Add a storage policy to allow anonymous uploads (see SQL file for details)

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_WHATSAPP_NUMBER=919999999999
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
npx vercel
```

Add the same environment variables in Vercel's project settings.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── products/route.ts   # GET/POST products
│   │   └── upload/route.ts     # Image upload to Supabase Storage
│   ├── admin/page.tsx           # Admin form to add products
│   ├── layout.tsx               # Root layout with Navbar & Footer
│   ├── page.tsx                 # Home page with hero & product grid
│   └── globals.css              # Design system & custom animations
├── components/
│   ├── Navbar.tsx               # Responsive navigation
│   ├── ProductCard.tsx          # Product card with WhatsApp button
│   ├── ProductGrid.tsx          # Grid with category filters
│   └── Footer.tsx               # Site footer
└── lib/
    ├── supabase.ts              # Supabase client
    └── types.ts                 # TypeScript types & constants
```

## API Routes

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| GET    | `/api/products`  | Fetch all products     |
| POST   | `/api/products`  | Create a new product   |
| POST   | `/api/upload`    | Upload image to storage|

## License

MIT
