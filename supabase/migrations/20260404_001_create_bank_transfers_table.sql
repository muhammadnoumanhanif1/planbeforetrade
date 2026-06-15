-- Migration: Create Bank Transfers Table
-- Date: 2026-04-04
-- Description: Create table for international bank transfer payments
-- Phase: 2-Remove-Stripe

CREATE TABLE IF NOT EXISTS public.bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'bank_transfer',
  method TEXT NOT NULL CHECK (method IN ('wire', 'ach', 'swift')),
  amount DECIMAL(10, 2) NOT NULL,
  plan TEXT DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
  proof_image_url TEXT,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bank_transfers_user_id 
  ON public.bank_transfers (user_id);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_status 
  ON public.bank_transfers (status);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_created_at 
  ON public.bank_transfers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_sender_email 
  ON public.bank_transfers (sender_email);

-- Enable RLS
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view only their own transfers
CREATE POLICY "Users can view own transfers" ON public.bank_transfers
  FOR SELECT USING (user_id = auth.uid());

-- Only users can insert their own transfers
CREATE POLICY "Users can insert own transfers" ON public.bank_transfers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No update/delete from frontend (admin only via direct DB)
-- Verification endpoint will use service role key
