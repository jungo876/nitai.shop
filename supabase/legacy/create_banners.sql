-- ============================================
-- NCK Agro - Homepage Banners Table
-- Promotional Banner Carousel System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create homepage_banners table
CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  redirect_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for ordering
CREATE INDEX IF NOT EXISTS idx_homepage_banners_order ON homepage_banners(display_order ASC);

-- 3. RLS
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all banner operations" ON homepage_banners
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
