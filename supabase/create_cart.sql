-- ============================================
-- NCK Agro - Cart Items Table
-- Phase 2: Cart System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  bulk_price_id UUID,

  box_count INT NOT NULL DEFAULT 1,
  quantity INT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate combinations
  UNIQUE (user_id, product_id, variant_id, bulk_price_id)
);

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- 3. RLS (allow anon access since we manage auth via cookies)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all cart operations" ON cart_items
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
