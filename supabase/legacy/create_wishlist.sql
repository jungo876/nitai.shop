-- ============================================
-- NCK Agro - Wishlist Table
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate wishlist entries
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);

-- RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all wishlist operations" ON wishlist_items
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
