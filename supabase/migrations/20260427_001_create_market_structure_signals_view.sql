-- Creates a compatibility view expected by /api/cron/execute-trades.
-- This migration handles schema drift by detecting available columns first.

DO $$
DECLARE
  has_setup BOOLEAN;
  has_status BOOLEAN;
  has_timeframe BOOLEAN;
  has_confidence BOOLEAN;
  has_ai_score BOOLEAN;
  has_action BOOLEAN;
  has_trend BOOLEAN;
  has_entry_price BOOLEAN;
  has_stop_loss BOOLEAN;
  has_tp1 BOOLEAN;
  has_tp2 BOOLEAN;
  has_tp3 BOOLEAN;
  has_take_profit BOOLEAN;
  has_entry_confirmed BOOLEAN;
  has_entry_quality_score BOOLEAN;

  setup_expr TEXT;
  status_expr TEXT;
  timeframe_expr TEXT;
  confidence_expr TEXT;
  ai_score_expr TEXT;
  action_expr TEXT;
  trend_expr TEXT;
  entry_price_expr TEXT;
  stop_loss_expr TEXT;
  tp1_expr TEXT;
  tp2_expr TEXT;
  tp3_expr TEXT;
  entry_confirmed_expr TEXT;
  entry_quality_score_expr TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'setup'
  ) INTO has_setup;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'status'
  ) INTO has_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'timeframe'
  ) INTO has_timeframe;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'confidence'
  ) INTO has_confidence;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'ai_score'
  ) INTO has_ai_score;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'action'
  ) INTO has_action;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'trend'
  ) INTO has_trend;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'entry_price'
  ) INTO has_entry_price;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'stop_loss'
  ) INTO has_stop_loss;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'tp1'
  ) INTO has_tp1;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'tp2'
  ) INTO has_tp2;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'tp3'
  ) INTO has_tp3;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'take_profit'
  ) INTO has_take_profit;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'entry_confirmed'
  ) INTO has_entry_confirmed;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'signals' AND column_name = 'entry_quality_score'
  ) INTO has_entry_quality_score;

  setup_expr := CASE
    WHEN has_setup THEN 's.setup::text'
    WHEN has_status THEN 's.status::text'
    ELSE '''READY''::text'
  END;

  status_expr := CASE
    WHEN has_status THEN 's.status::text'
    WHEN has_setup THEN 's.setup::text'
    ELSE '''READY''::text'
  END;

  timeframe_expr := CASE
    WHEN has_timeframe THEN 'COALESCE(s.timeframe::text, ''1h'')'
    ELSE '''1h''::text'
  END;

  ai_score_expr := CASE
    WHEN has_ai_score THEN 'COALESCE(s.ai_score::int, 80)'
    ELSE '80::int'
  END;

  confidence_expr := CASE
    WHEN has_confidence THEN 'COALESCE(s.confidence::numeric, 80)'
    WHEN has_ai_score THEN 'COALESCE(s.ai_score::numeric, 80)'
    ELSE '80::numeric'
  END;

  trend_expr := CASE
    WHEN has_trend THEN 'COALESCE(s.trend::text, ''UPTREND'')'
    ELSE '''UPTREND''::text'
  END;

  action_expr := CASE
    WHEN has_action THEN 'COALESCE(s.action::text, ''BUY'')'
    WHEN has_trend THEN 'CASE WHEN s.trend::text = ''DOWNTREND'' THEN ''SELL'' ELSE ''BUY'' END'
    ELSE '''BUY''::text'
  END;

  entry_price_expr := CASE
    WHEN has_entry_price THEN 's.entry_price::numeric'
    ELSE 'NULL::numeric'
  END;

  stop_loss_expr := CASE
    WHEN has_stop_loss THEN 's.stop_loss::numeric'
    ELSE 'NULL::numeric'
  END;

  tp1_expr := CASE
    WHEN has_tp1 THEN 's.tp1::numeric'
    WHEN has_take_profit THEN 's.take_profit::numeric'
    ELSE 'NULL::numeric'
  END;

  tp2_expr := CASE
    WHEN has_tp2 THEN 's.tp2::numeric'
    ELSE 'NULL::numeric'
  END;

  tp3_expr := CASE
    WHEN has_tp3 THEN 's.tp3::numeric'
    ELSE 'NULL::numeric'
  END;

  entry_confirmed_expr := CASE
    WHEN has_entry_confirmed THEN 'COALESCE(s.entry_confirmed::boolean, false)'
    ELSE 'false::boolean'
  END;

  entry_quality_score_expr := CASE
    WHEN has_entry_quality_score THEN 's.entry_quality_score::jsonb'
    ELSE 'NULL::jsonb'
  END;

  EXECUTE 'DROP VIEW IF EXISTS public.market_structure_signals';

  EXECUTE format(
    'CREATE VIEW public.market_structure_signals AS
     SELECT
       s.id::text AS id,
       s.symbol::text AS symbol,
       %s AS timeframe,
       %s AS confidence,
       %s AS setup,
       %s AS status,
       %s AS trend,
       %s AS action,
       %s AS ai_score,
       %s AS entry_price,
       NULL::numeric[] AS entry_zone,
       %s AS stop_loss,
       %s AS tp1,
       %s AS tp2,
       %s AS tp3,
       %s AS entry_confirmed,
       %s AS entry_quality_score
     FROM public.signals s',
    timeframe_expr,
    confidence_expr,
    setup_expr,
    status_expr,
    trend_expr,
    action_expr,
    ai_score_expr,
    entry_price_expr,
    stop_loss_expr,
    tp1_expr,
    tp2_expr,
    tp3_expr,
    entry_confirmed_expr,
    entry_quality_score_expr
  );

  EXECUTE 'GRANT SELECT ON public.market_structure_signals TO anon, authenticated, service_role';
END $$;