-- ============================================
-- Migration: Add bulk pricing system
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================

-- 1. Add new columns to products table (skip if already exist)
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit text DEFAULT '';

-- 2. Create bulk_prices table
CREATE TABLE IF NOT EXISTS bulk_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_qty integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  label text DEFAULT NULL,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 3. Enable RLS (Row Level Security) but allow public read
ALTER TABLE bulk_prices ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read bulk_prices
CREATE POLICY "Allow public read on bulk_prices"
  ON bulk_prices
  FOR SELECT
  USING (true);

-- Allow anyone to insert (for admin API via anon key)
CREATE POLICY "Allow public insert on bulk_prices"
  ON bulk_prices
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update
CREATE POLICY "Allow public update on bulk_prices"
  ON bulk_prices
  FOR UPDATE
  USING (true);

-- Allow anyone to delete
CREATE POLICY "Allow public delete on bulk_prices"
  ON bulk_prices
  FOR DELETE
  USING (true);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bulk_prices_product_id ON bulk_prices(product_id);
