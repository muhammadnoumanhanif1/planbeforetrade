-- =====================================================
-- Plan Before Trade - Supabase Database Schema
-- =====================================================
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin policy: service role can manage all profiles (for payment verification)
CREATE POLICY "Service role can manage all profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'easypaisa', 'jazzcash')),
  provider_subscription_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('weekly', 'monthly', 'yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (via webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. USAGE LOGS TABLE (for tracking analysis requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'analysis'
  metadata JSONB DEFAULT '{}', -- {exchange, symbol, timeframe}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Index for efficient daily queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date 
  ON public.usage_logs (user_id, created_at DESC);

-- Policies
CREATE POLICY "Users can view own usage"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. WATCHLISTS TABLE (Premium feature)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coins JSONB NOT NULL DEFAULT '[]', -- [{exchange: "binance", symbol: "BTCUSDT"}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own watchlists"
  ON public.watchlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. PRICE ALERTS TABLE (Premium feature)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Index for active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_active 
  ON public.alerts (is_active, exchange, symbol) WHERE is_active = TRUE;

-- Policies
CREATE POLICY "Users can manage own alerts"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. SAVED ANALYSES TABLE (Premium feature)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.saved_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;

-- Index for user's saved analyses
CREATE INDEX IF NOT EXISTS idx_saved_analyses_user 
  ON public.saved_analyses (user_id, created_at DESC);

-- Policies
CREATE POLICY "Users can manage own saved analyses"
  ON public.saved_analyses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. PAKISTAN PAYMENTS TABLE (manual verification)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pakistan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('easypaisa', 'jazzcash')),
  transaction_id TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  sender_number TEXT,
  user_email TEXT,
  plan TEXT DEFAULT 'weekly' CHECK (plan IN ('weekly', 'monthly', 'yearly')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  rejection_reason TEXT,
  verified_by TEXT, -- Admin who verified
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pakistan_payments ENABLE ROW LEVEL SECURITY;

-- Index for pending payments
CREATE INDEX IF NOT EXISTS idx_pakistan_payments_pending 
  ON public.pakistan_payments (status) WHERE status = 'pending';

-- Policies
CREATE POLICY "Users can view own payments"
  ON public.pakistan_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.pakistan_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update payments (admin verification)
CREATE POLICY "Service role can manage payments"
  ON public.pakistan_payments FOR UPDATE
  USING (auth.role() = 'service_role');

-- =====================================================
-- 8. AI LEARNING TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  trend TEXT NOT NULL CHECK (trend IN ('UPTREND', 'DOWNTREND', 'SIDEWAYS')),
  strategy_type TEXT NOT NULL,
  entry_zone JSONB,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'LOSS')),
  result_r DECIMAL NOT NULL,
  ai_score DECIMAL NOT NULL CHECK (ai_score >= 0 AND ai_score <= 100),
  indicators JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_trade_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_trade_history_created_at
  ON public.ai_trade_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_history_symbol_trend_strategy
  ON public.ai_trade_history (symbol, trend, strategy_type, created_at DESC);

CREATE POLICY "Service role can manage ai trade history"
  ON public.ai_trade_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ai trade history"
  ON public.ai_trade_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.ai_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  trend_weight DECIMAL NOT NULL,
  volume_weight DECIMAL NOT NULL,
  rsi_weight DECIMAL NOT NULL,
  entry_quality_weight DECIMAL NOT NULL,
  historical_performance_weight DECIMAL NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_weights ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_weights_created_at
  ON public.ai_weights (created_at DESC);

CREATE POLICY "Service role can manage ai weights"
  ON public.ai_weights FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ai weights"
  ON public.ai_weights FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 9. HISTORICAL PERFORMANCE TABLE (for AI Scoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.historical_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_signature TEXT NOT NULL UNIQUE,
  total_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL NOT NULL DEFAULT 0,
  average_r DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.historical_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage historical performance"
  ON public.historical_performance FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read historical performance"
    ON public.historical_performance FOR SELECT
    USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER historical_performance_updated_at
  BEFORE UPDATE ON public.historical_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 10. SIGNALS TABLE (Smart Trading Engine)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  signal_number TEXT NOT NULL CHECK (signal_number IN ('S1', 'S2', 'S3')),
  trend TEXT NOT NULL CHECK (trend IN ('UPTREND', 'DOWNTREND', 'SIDEWAYS')),
  entry_zone JSONB,
  entry_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  risk_reward_ratio DECIMAL DEFAULT 3,
  status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'READY', 'TRIGGERED', 'CLOSED', 'INVALID')),
  result TEXT CHECK (result IN ('WIN', 'LOSS')),
  result_r DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_signals_user_symbol
  ON public.signals (user_id, symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_status
  ON public.signals (status) WHERE status IN ('WAITING', 'READY', 'TRIGGERED');

CREATE POLICY "Users can manage own signals"
  ON public.signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage signals"
  ON public.signals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 11. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply to subscriptions
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply to watchlists
CREATE TRIGGER watchlists_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 12. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Get user's tier (free or premium)
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier INTO user_tier
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_tier, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_sub BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO has_sub;
  
  RETURN has_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get today's analysis count for user
CREATE OR REPLACE FUNCTION get_today_usage_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_val
  FROM public.usage_logs
  WHERE user_id = user_uuid
  AND action = 'analysis'
  AND created_at >= DATE_TRUNC('day', NOW());
  
  RETURN count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can perform analysis
CREATE OR REPLACE FUNCTION can_analyze(user_uuid UUID, max_free_analyses INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
  usage_count INTEGER;
BEGIN
  is_premium := has_active_subscription(user_uuid);
  
  IF is_premium THEN
    RETURN TRUE;
  END IF;
  
  usage_count := get_today_usage_count(user_uuid);
  RETURN usage_count < max_free_analyses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. AI LEARNING MIGRATION (2026-04-22)
-- From supabase/migrations/20260422_add_ai_learning_tables.sql
-- =====================================================

-- supabase/migrations/20260422_add_ai_learning_tables.sql

-- =====================================================
-- 1. AI TRADE HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  trend TEXT NOT NULL CHECK (trend IN ('UPTREND', 'DOWNTREND', 'SIDEWAYS')),
  strategy_type TEXT NOT NULL,
  entry_zone JSONB,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'LOSS')),
  result_r DECIMAL NOT NULL,
  ai_score DECIMAL NOT NULL CHECK (ai_score >= 0 AND ai_score <= 100),
  indicators JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_trade_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_trade_history_created_at
  ON public.ai_trade_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_history_symbol_trend_strategy
  ON public.ai_trade_history (symbol, trend, strategy_type, created_at DESC);

CREATE POLICY "Service role can manage ai trade history"
  ON public.ai_trade_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ai trade history"
  ON public.ai_trade_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 2. AI WEIGHTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL UNIQUE,
  trend_weight DECIMAL NOT NULL,
  volume_weight DECIMAL NOT NULL,
  rsi_weight DECIMAL NOT NULL,
  entry_quality_weight DECIMAL NOT NULL,
  historical_performance_weight DECIMAL NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_weights ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_weights_created_at
  ON public.ai_weights (created_at DESC);

CREATE POLICY "Service role can manage ai weights"
  ON public.ai_weights FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ai weights"
  ON public.ai_weights FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- 3. HISTORICAL PERFORMANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.historical_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_signature TEXT NOT NULL UNIQUE,
  total_trades INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL NOT NULL DEFAULT 0,
  average_r DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.historical_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage historical performance"
  ON public.historical_performance FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read historical performance"
    ON public.historical_performance FOR SELECT
    USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER historical_performance_updated_at
  BEFORE UPDATE ON public.historical_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- DONE! Your database schema is ready.
-- =====================================================
-- =====================================================
-- TELEGRAM DISPATCH LOG (prevents duplicate signals)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.telegram_dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  setup_key TEXT NOT NULL, -- unique key for signal setup (symbol + entry_zone + direction)
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_id INTEGER,
  UNIQUE(symbol, setup_key)
);

CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_log_sent_at ON public.telegram_dispatch_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_telegram_dispatch_log_symbol ON public.telegram_dispatch_log(symbol);

-- =====================================================
-- TRADE EXECUTION TRACKING
-- =====================================================
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS trade_executed BOOLEAN DEFAULT false;
