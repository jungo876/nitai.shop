-- ============================================
-- NCK Agro - Orders Database Schema
-- Phase 1: Order Database Structure
-- ============================================

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  total_amount NUMERIC NOT NULL,
  advance_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,

  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'placed',

  payment_method TEXT,

  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  product_id UUID,
  variant_id UUID,
  bulk_price_id UUID,

  product_name TEXT NOT NULL,
  variant_label TEXT NOT NULL,

  box_count INT NOT NULL,
  units_per_box INT NOT NULL,

  price_per_unit NUMERIC NOT NULL,
  total_units INT NOT NULL,
  total_price NUMERIC NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 4. Enable RLS with open policies (API uses service key)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all orders operations" ON orders
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all order_items operations" ON order_items
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
