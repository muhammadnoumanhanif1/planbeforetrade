CREATE TABLE signals (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    signal_number INT NOT NULL,
    entry_zone TEXT NOT NULL,
    stop_loss DOUBLE PRECISION NOT NULL,
    take_profit DOUBLE PRECISION NOT NULL,
    risk_reward_ratio TEXT DEFAULT '1:3' NOT NULL,
    ai_score INT,
    status TEXT DEFAULT 'WAITING' NOT NULL,
    result TEXT,
    result_R DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);