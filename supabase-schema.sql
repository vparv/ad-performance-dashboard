-- Create the v_ad_performance_data table
CREATE TABLE public.v_ad_performance_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Campaign Info
  campaign_name TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  
  -- Ad Set Info
  ad_set_name TEXT NOT NULL,
  ad_set_id TEXT NOT NULL,
  
  -- Ad Info
  ad_name TEXT NOT NULL,
  ad_id TEXT NOT NULL,
  
  -- Targeting & Placement
  placement TEXT NOT NULL,
  platform TEXT NOT NULL,
  
  -- Status & Delivery
  delivery_status TEXT NOT NULL,
  delivery_level TEXT NOT NULL,
  
  -- Performance Metrics
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  frequency DECIMAL DEFAULT 0,
  results INTEGER DEFAULT 0,
  amount_spent DECIMAL DEFAULT 0,
  cost_per_result DECIMAL DEFAULT 0,
  purchase_roas DECIMAL DEFAULT 0,
  ctr_all DECIMAL DEFAULT 0,
  result_rate DECIMAL DEFAULT 0,
  
  -- Campaign Timing
  starts TEXT,
  ends TEXT,
  reporting_starts TEXT,
  reporting_ends TEXT,
  day TEXT NOT NULL, -- Daily performance date (YYYY-MM-DD format)
  
  -- Attribution
  attribution_setting TEXT,
  result_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique composite index to prevent duplicate records for the same ad on the same day with same placement
CREATE UNIQUE INDEX idx_v_ad_performance_unique 
ON public.v_ad_performance_data (ad_id, day, placement, platform);

-- Create indexes for common queries
CREATE INDEX idx_v_ad_performance_campaign_id ON public.v_ad_performance_data (campaign_id);
CREATE INDEX idx_v_ad_performance_ad_set_id ON public.v_ad_performance_data (ad_set_id);
CREATE INDEX idx_v_ad_performance_ad_id ON public.v_ad_performance_data (ad_id);
CREATE INDEX idx_v_ad_performance_day ON public.v_ad_performance_data (day);
CREATE INDEX idx_v_ad_performance_campaign_day ON public.v_ad_performance_data (campaign_id, day);
CREATE INDEX idx_v_ad_performance_amount_spent ON public.v_ad_performance_data (amount_spent);
CREATE INDEX idx_v_ad_performance_purchase_roas ON public.v_ad_performance_data (purchase_roas);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_v_ad_performance_data_updated_at 
BEFORE UPDATE ON public.v_ad_performance_data 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for basic security
ALTER TABLE public.v_ad_performance_data ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can modify this based on your auth requirements)
CREATE POLICY "Allow all operations on v_ad_performance_data" 
ON public.v_ad_performance_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create a view for campaign summaries to optimize common queries
CREATE OR REPLACE VIEW v_campaign_summary AS
SELECT 
  campaign_id,
  campaign_name,
  MIN(day) as earliest_day,
  MAX(day) as latest_day,
  SUM(amount_spent) as total_spend,
  SUM(results) as total_results,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  COUNT(DISTINCT ad_set_id) as ad_set_count,
  COUNT(DISTINCT ad_id) as ad_count,
  -- Weighted averages
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(purchase_roas * amount_spent) / SUM(amount_spent)
    ELSE 0 
  END as avg_roas,
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(ctr_all * amount_spent) / SUM(amount_spent) 
    ELSE 0 
  END as avg_ctr,
  CASE 
    WHEN SUM(results) > 0 
    THEN SUM(amount_spent) / SUM(results) 
    ELSE 0 
  END as cost_per_result
FROM public.v_ad_performance_data
GROUP BY campaign_id, campaign_name;

-- Create a view for ad set summaries
CREATE OR REPLACE VIEW v_ad_set_summary AS
SELECT 
  ad_set_id,
  ad_set_name,
  campaign_id,
  campaign_name,
  MIN(day) as earliest_day,
  MAX(day) as latest_day,
  SUM(amount_spent) as total_spend,
  SUM(results) as total_results,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  COUNT(DISTINCT ad_id) as ad_count,
  -- Weighted averages
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(purchase_roas * amount_spent) / SUM(amount_spent)
    ELSE 0 
  END as avg_roas,
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(ctr_all * amount_spent) / SUM(amount_spent) 
    ELSE 0 
  END as avg_ctr,
  CASE 
    WHEN SUM(results) > 0 
    THEN SUM(amount_spent) / SUM(results) 
    ELSE 0 
  END as cost_per_result
FROM public.v_ad_performance_data
GROUP BY ad_set_id, ad_set_name, campaign_id, campaign_name;

-- Create a view for daily summaries
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT 
  day,
  SUM(amount_spent) as total_spend,
  SUM(results) as total_results,
  SUM(impressions) as total_impressions,
  SUM(reach) as total_reach,
  COUNT(DISTINCT campaign_id) as campaign_count,
  COUNT(DISTINCT ad_set_id) as ad_set_count,
  COUNT(DISTINCT ad_id) as ad_count,
  -- Weighted averages
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(purchase_roas * amount_spent) / SUM(amount_spent)
    ELSE 0 
  END as avg_roas,
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(ctr_all * amount_spent) / SUM(amount_spent) 
    ELSE 0 
  END as avg_ctr,
  CASE 
    WHEN SUM(results) > 0 
    THEN SUM(amount_spent) / SUM(results) 
    ELSE 0 
  END as cost_per_result
FROM public.v_ad_performance_data
GROUP BY day
ORDER BY day DESC;