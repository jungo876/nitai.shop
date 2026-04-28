-- ============================================
-- NCK Agro - Supabase Database Setup
-- Run this SQL in the Supabase SQL Editor
-- ============================================

-- 1. Create the products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow public read access (no auth needed)
CREATE POLICY "Allow public read access"
  ON products
  FOR SELECT
  TO anon
  USING (true);

-- 4. Create a policy to allow public insert (since no auth is required for admin)
CREATE POLICY "Allow public insert access"
  ON products
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 5. Create an index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 6. Create an index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- ============================================
-- Supabase Storage Setup (do this in the UI):
--
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "product-images"
-- 3. Make the bucket PUBLIC
-- 4. Add a storage policy for uploads:
--    - Policy name: "Allow public uploads"
--    - For: INSERT
--    - Target roles: anon
--    - WITH CHECK: true
-- ============================================
