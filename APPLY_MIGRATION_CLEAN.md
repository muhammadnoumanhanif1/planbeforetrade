# Apply AI Learning Database Migration - CLEAN SQL

**Status:** Ready to paste into Supabase SQL Editor

## Instructions

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (planbeforetrade)
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. **Copy the SQL below** (everything from "CREATE TABLE" to the end)
6. **Paste it** into the SQL Editor
7. Click **Run** button
8. You should see: "Success. No rows returned." for each statement

## Raw SQL (Copy everything below this line)

```
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

ALTER TABLE public.historical_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage historical performance"
  ON public.historical_performance FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read historical performance"
    ON public.historical_performance FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER historical_performance_updated_at
  BEFORE UPDATE ON public.historical_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## After Running the Migration

1. ✅ You should see success messages
2. ✅ Check **Table Editor** - you should see these new tables:
   - `ai_trade_history`
   - `ai_weights`
   - `historical_performance`
3. ✅ If tables exist, the migration was successful
4. ✅ Your app can now use the AI Learning System

## If You Get Errors

- **"relation already exists"** - Safe to ignore, tables already created
- **"permission denied"** - Check that you're using the correct Supabase credentials in `.env.local`
- **Other errors** - Check the MIGRATION_CHECKLIST.md for troubleshooting

## Next Steps After Migration

Once tables are created, you can:
1. Start recording trades: `POST /api/ai-learning/record-trade`
2. View AI insights: `GET http://localhost:3000/admin/ai-insights`
3. Recalculate weights: `POST /api/ai-learning/recalculate-weights`
