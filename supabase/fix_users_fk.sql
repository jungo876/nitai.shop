-- Fix for the "violates foreign key constraint users_id_fkey" error
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
