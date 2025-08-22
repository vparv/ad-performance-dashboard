-- SQL script to rename all tables and views from z_ prefix to v_ prefix

-- Step 1: Drop existing views (they depend on the table)
DROP VIEW IF EXISTS z_campaign_summary;
DROP VIEW IF EXISTS z_ad_set_summary;
DROP VIEW IF EXISTS z_daily_summary;

-- Step 2: Rename the main table
ALTER TABLE public.z_ad_performance_data RENAME TO v_ad_performance_data;

-- Step 3: Rename all indexes
ALTER INDEX idx_z_ad_performance_unique RENAME TO idx_v_ad_performance_unique;
ALTER INDEX idx_z_ad_performance_campaign_id RENAME TO idx_v_ad_performance_campaign_id;
ALTER INDEX idx_z_ad_performance_ad_set_id RENAME TO idx_v_ad_performance_ad_set_id;
ALTER INDEX idx_z_ad_performance_ad_id RENAME TO idx_v_ad_performance_ad_id;
ALTER INDEX idx_z_ad_performance_day RENAME TO idx_v_ad_performance_day;
ALTER INDEX idx_z_ad_performance_campaign_day RENAME TO idx_v_ad_performance_campaign_day;
ALTER INDEX idx_z_ad_performance_amount_spent RENAME TO idx_v_ad_performance_amount_spent;
ALTER INDEX idx_z_ad_performance_purchase_roas RENAME TO idx_v_ad_performance_purchase_roas;

-- Step 4: Rename the trigger
DROP TRIGGER IF EXISTS update_z_ad_performance_data_updated_at ON public.v_ad_performance_data;
CREATE TRIGGER update_v_ad_performance_data_updated_at 
BEFORE UPDATE ON public.v_ad_performance_data 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Update RLS policy
DROP POLICY IF EXISTS "Allow all operations on z_ad_performance_data" ON public.v_ad_performance_data;
CREATE POLICY "Allow all operations on v_ad_performance_data" 
ON public.v_ad_performance_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Step 6: Recreate views with v_ prefix pointing to the renamed table
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