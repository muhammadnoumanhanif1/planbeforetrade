# AI Learning System - Database Setup Guide

The AI learning system requires three tables to be created in Supabase. If you're seeing "Could not find the table 'public.ai_weights'" errors, follow these steps:

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy and paste the entire content of `supabase/migrations/20260422_add_ai_learning_tables.sql`
5. Click **"Run"**

The migration will create:
- `ai_trade_history` - Records of completed trades with results
- `ai_weights` - AI model weight versions for scoring
- `historical_performance` - Performance statistics by setup signature

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g @supabase/cli

# Link your project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase migrations push
```

### Option 3: Direct API Execution (Advanced)

Use the provided Node.js script:

```bash
node scripts/apply-migrations.js
```

## Verification

After applying the migration, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_weights', 'ai_trade_history', 'historical_performance');
```

All three tables should appear in the results.

## Troubleshooting

### Error: "Could not find the table 'public.ai_weights'"

This means the migration hasn't been applied yet. Use Option 1 above.

### Error: "Permission denied" or "Unauthorized"

Make sure you're:
- Using the correct Supabase URL in `.env.local`
- Have the correct `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- The service role key starts with `eyJ...` (JWT format)

### RLS Policies not working

The migration includes Row-Level Security (RLS) policies:
- Service role: Full access (used by API server-side)
- Authenticated users: Read-only access
- Anonymous users: No access

These are automatically created with the migration.

## Initial Data

The system uses default weights when no weights exist. To bootstrap the system:

1. Manually record some trades via `/api/ai-learning/record-trade`
2. The system will auto-calculate weights after 10+ trades
3. Or manually insert a default weight version:

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
