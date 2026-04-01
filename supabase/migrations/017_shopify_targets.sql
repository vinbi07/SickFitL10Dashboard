-- Create shopify_targets table for editable financial goals
CREATE TABLE IF NOT EXISTS shopify_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  target_period TEXT CHECK (target_period IN ('daily', '7day', '30day', 'annual')),
  currency_code TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_shopify_targets_metric_name ON shopify_targets(metric_name);
CREATE INDEX idx_shopify_targets_target_period ON shopify_targets(target_period);

-- RLS policies
ALTER TABLE shopify_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON shopify_targets
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON shopify_targets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON shopify_targets
  FOR UPDATE WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON shopify_targets
  FOR DELETE USING (true);

-- Insert default targets
INSERT INTO shopify_targets (metric_name, target_value, target_period, currency_code, notes)
VALUES
  ('revenue', 50000, '7day', 'USD', 'Target revenue for 7-day period'),
  ('revenue', 200000, '30day', 'USD', 'Target revenue for 30-day period'),
  ('aov', 60, '7day', 'USD', 'Target average order value for 7-day period'),
  ('aov', 60, '30day', 'USD', 'Target average order value for 30-day period'),
  ('orders', 1000, '7day', 'USD', 'Target order count for 7-day period'),
  ('orders', 4000, '30day', 'USD', 'Target order count for 30-day period')
ON CONFLICT DO NOTHING;
