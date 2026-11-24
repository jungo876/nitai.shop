-- ============================================================
-- PAYMENT FLOW UPDATE: Prepaid + COD (10% Advance)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Update payment_method column to store 'prepaid' or 'cod'
-- (If your existing column stores 'razorpay', update old values)
ALTER TABLE orders ALTER COLUMN payment_method TYPE text;

-- Update any existing orders that used the old 'razorpay' value
UPDATE orders SET payment_method = 'prepaid' WHERE payment_method = 'razorpay';

-- 2. Ensure payment_status supports the new values
-- Valid values: pending, advance_paid, paid, failed, cancelled
-- (The existing 'advance_paid' and 'fully_paid' values remain compatible)
-- Update 'fully_paid' to 'paid' for consistency
UPDATE orders SET payment_status = 'paid' WHERE payment_status = 'fully_paid';

-- 3. The existing columns already cover the new requirements:
--    total_amount   → Full order value (e.g. 25000)
--    advance_amount → Amount received (renamed concept: now = paid_amount)
--    remaining_amount → Remaining to collect
--
-- For PREPAID orders:
--    advance_amount = total_amount, remaining_amount = 0, payment_status = 'paid'
--
-- For COD orders:
--    advance_amount = 10% of total, remaining_amount = 90%, payment_status = 'advance_paid'

-- That's it! No new columns needed.
-- The existing schema handles both payment methods perfectly.
