-- supabase/migrations/20260422_002_create_historical_performance_table.sql

CREATE TABLE historical_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setup_signature TEXT NOT NULL UNIQUE,
    total_trades INT NOT NULL,
    win_rate REAL NOT NULL,
    average_R REAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
