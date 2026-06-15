# Verify Migration in Supabase

## Quick Check - Run This SQL

Go to Supabase SQL Editor and run:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_trade_history', 'ai_weights', 'historical_performance');
```

You should see 3 rows returned with the table names.

## If Tables Don't Appear

The schema cache may need refreshing. Try this in the SQL Editor:

```sql
-- Drop policies (if they exist)
DROP POLICY IF EXISTS "Service role can manage ai_trade_history" ON public.ai_trade_history;
DROP POLICY IF EXISTS "Service role can manage ai_weights" ON public.ai_weights;
DROP POLICY IF EXISTS "Service role can manage historical_performance" ON public.historical_performance;
DROP POLICY IF EXISTS "Authenticated users can read ai_trade_history" ON public.ai_trade_history;
DROP POLICY IF EXISTS "Authenticated users can read ai_weights" ON public.ai_weights;
DROP POLICY IF EXISTS "Authenticated users can read historical_performance" ON public.historical_performance;

-- Drop tables
DROP TABLE IF EXISTS public.ai_trade_history CASCADE;
DROP TABLE IF EXISTS public.ai_weights CASCADE;
DROP TABLE IF EXISTS public.historical_performance CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
```

Then paste and run the full migration SQL again from APPLY_MIGRATION_CLEAN.md

## After Verification

Once tables exist in Supabase:
1. Restart your local dev server: `npm run dev`
2. Try the API again: `GET http://localhost:3000/api/ai-insights`
3. It should return weights and performance data (or empty arrays if no data yet)
