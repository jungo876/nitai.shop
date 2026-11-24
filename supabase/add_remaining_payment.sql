-- ============================================
-- NCK Agro - Add remaining_payment_method column
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS remaining_payment_method TEXT DEFAULT 'cash_on_delivery';
