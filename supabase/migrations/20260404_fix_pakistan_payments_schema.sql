-- Migration: Fix Pakistan Payments Schema
-- Date: 2026-04-04
-- Description: Add missing fields and fix field names in pakistan_payments table
-- Phase: 1-Fix-Pakistan-Payments - Phase 1 UAT Fixes

-- Step 1: Rename phone_number to sender_number
ALTER TABLE public.pakistan_payments 
RENAME COLUMN phone_number TO sender_number;

-- Step 2: Add missing fields
ALTER TABLE public.pakistan_payments
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Step 3: Add constraint for plan values
ALTER TABLE public.pakistan_payments
ADD CONSTRAINT check_pakistan_payments_plan 
  CHECK (plan IN ('weekly', 'monthly', 'yearly'));

-- Step 4: Create index for user_email lookups
CREATE INDEX IF NOT EXISTS idx_pakistan_payments_user_email 
  ON public.pakistan_payments (user_email);

-- Step 5: Create index for plan-based lookups
CREATE INDEX IF NOT EXISTS idx_pakistan_payments_plan 
  ON public.pakistan_payments (plan);

-- Verification: Count columns (should be 14+)
-- SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pakistan_payments';
