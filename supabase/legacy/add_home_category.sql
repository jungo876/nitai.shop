-- Add home_category column to products table for homepage grouping
-- This is separate from the existing 'category' field which tracks product type (Insecticide, Fungicide, etc.)
-- home_category is used for homepage navigation grouping (Crop Protection, Crop Nutrition, Seeds, Agro Tools)

ALTER TABLE products ADD COLUMN IF NOT EXISTS home_category TEXT;

-- Create index for filtering by home_category
CREATE INDEX IF NOT EXISTS idx_products_home_category ON products(home_category);
