-- Migration to add country to users and create exchange_rates and payment_logs

ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);

CREATE TABLE IF NOT EXISTS exchange_rates (
    id VARCHAR(30) PRIMARY KEY,
    base_currency VARCHAR(10) DEFAULT 'USD',
    target_currency VARCHAR(10) DEFAULT 'INR',
    rate DOUBLE PRECISION NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_logs (
    id VARCHAR(30) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL,
    country VARCHAR(2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    usd_price DOUBLE PRECISION NOT NULL,
    exchange_rate_used DOUBLE PRECISION,
    final_amount DOUBLE PRECISION NOT NULL,
    razorpay_order_id VARCHAR(100),
    payment_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
