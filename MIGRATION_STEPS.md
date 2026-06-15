# Step-by-Step: Apply AI Learning Database Migrations

## 📋 Prerequisites
- Supabase project open and accessible
- Admin access to your Supabase project
- The migration SQL ready (provided below)

---

## 🚀 Steps to Apply Migration

### Step 1: Open Supabase Dashboard
Visit your project: https://tmndsxuefhvniwmviwcg.supabase.co/project/

### Step 2: Navigate to SQL Editor
1. In the left sidebar, look for **SQL Editor** (has a terminal/code icon)
2. Click on it to open the SQL editor

### Step 3: Create New Query
1. Click the **"+ New Query"** button at the top
2. You'll see a new blank SQL editor window

### Step 4: Paste the Migration SQL
Copy and paste this entire SQL into the editor:

```sql
-- AI TRADE HISTORY TABLE
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

-- AI WEIGHTS TABLE
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

-- HISTORICAL PERFORMANCE TABLE
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
```

### Step 5: Execute the Migration
1. Click the **"Run"** button (usually a play/execute icon at the top right)
2. Wait for the query to complete
3. You should see a success message like:
   - "Query executed successfully"
   - Or: "Rows affected: 0" (this is normal for DDL statements)

### Step 6: Verify the Migration Succeeded
Run this verification query in a new SQL Editor window:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_weights', 'ai_trade_history', 'historical_performance');
```

**Expected result:** All 3 tables should appear
```
ai_weights
ai_trade_history
historical_performance
```

---

## 🎯 Optional: Bootstrap with Default Weights

Once tables are created, you can add initial AI weights by running:

```sql
INSERT INTO public.ai_weights (
  version,
  trend_weight,
  volume_weight,
  rsi_weight,
  entry_quality_weight,
  historical_performance_weight,
  metadata
) VALUES (
  1,
  0.25,
  0.20,
  0.20,
  0.20,
  0.15,
  '{"source": "default", "description": "Initial weights"}'
);
```

---

## ✅ Testing After Migration

Once migration is complete, test the API:

```bash
curl http://localhost:3000/api/ai-insights
```

**Expected response:**
```json
{
  "weights": [
    {
      "version": 1,
      "trend_weight": 0.25,
      "volume_weight": 0.20,
      "rsi_weight": 0.20,
      "entry_quality_weight": 0.20,
      "historical_performance_weight": 0.15,
      "created_at": "2026-04-22T...",
      "metadata": {...}
    }
  ],
  "performance": []
}
```

---

## 🔧 Troubleshooting

### Error: "relation already exists"
- This means the tables were already created
- You can safely ignore this error or use `DROP TABLE IF EXISTS` first

### Error: "permission denied"
- Make sure you're logged in with admin/owner account
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env.local`

### Tables not appearing
- Wait a few seconds and refresh the Tables list
- Try the verification query again

### API still returns errors
- Ensure all 3 tables exist (run verification query)
- Check that RLS policies were created
- Restart the Next.js dev server

---

## 📞 Need Help?
If you encounter any issues:
1. Check the Supabase dashboard for error messages
2. Review the `AI_LEARNING_DB_SETUP.md` file for additional troubleshooting
3. Run the verification query to confirm tables exist
