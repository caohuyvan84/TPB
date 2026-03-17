CREATE TABLE IF NOT EXISTS bank_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  account_number VARCHAR,
  balance DECIMAL(20,2),
  status VARCHAR,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_products_customer ON bank_products(customer_id);
