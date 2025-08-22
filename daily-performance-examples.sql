-- Daily Performance Analysis Examples
-- These work with your existing v_ad_performance_data table

-- 1. Daily performance for a specific campaign
SELECT 
  day,
  campaign_name,
  SUM(amount_spent) as daily_spend,
  SUM(results) as daily_results,
  AVG(purchase_roas) as avg_roas,
  COUNT(DISTINCT ad_id) as active_ads
FROM v_ad_performance_data 
WHERE campaign_id = 'your_campaign_id'
  AND day >= '2025-01-01'
GROUP BY day, campaign_name, campaign_id
ORDER BY day DESC;

-- 2. Daily performance for a specific ad set
SELECT 
  day,
  ad_set_name,
  campaign_name,
  SUM(amount_spent) as daily_spend,
  SUM(results) as daily_results,
  SUM(impressions) as daily_impressions,
  AVG(purchase_roas) as avg_roas
FROM v_ad_performance_data 
WHERE ad_set_id = 'your_adset_id'
  AND day >= '2025-01-01'
GROUP BY day, ad_set_name, ad_set_id, campaign_name
ORDER BY day DESC;

-- 3. Daily performance for a specific ad
SELECT 
  day,
  ad_name,
  ad_set_name,
  campaign_name,
  platform,
  placement,
  amount_spent,
  results,
  purchase_roas,
  ctr_all,
  impressions
FROM v_ad_performance_data 
WHERE ad_id = 'your_ad_id'
  AND day >= '2025-01-01'
ORDER BY day DESC, platform, placement;

-- 4. Top performing campaigns by day
SELECT 
  day,
  campaign_name,
  SUM(amount_spent) as daily_spend,
  SUM(results) as daily_results,
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(purchase_roas * amount_spent) / SUM(amount_spent)
    ELSE 0 
  END as weighted_avg_roas
FROM v_ad_performance_data 
WHERE day >= '2025-01-01'
GROUP BY day, campaign_name, campaign_id
HAVING SUM(amount_spent) > 100  -- Filter campaigns with meaningful spend
ORDER BY day DESC, daily_spend DESC;

-- 5. Week-over-week performance comparison
SELECT 
  campaign_name,
  DATE_TRUNC('week', day::date) as week_start,
  SUM(amount_spent) as weekly_spend,
  SUM(results) as weekly_results,
  AVG(purchase_roas) as avg_roas,
  COUNT(DISTINCT day) as active_days
FROM v_ad_performance_data 
WHERE day >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY campaign_name, campaign_id, DATE_TRUNC('week', day::date)
ORDER BY week_start DESC, weekly_spend DESC;

-- 6. Daily trend analysis - last 30 days
SELECT 
  day,
  SUM(amount_spent) as total_daily_spend,
  SUM(results) as total_daily_results,
  COUNT(DISTINCT campaign_id) as active_campaigns,
  COUNT(DISTINCT ad_set_id) as active_adsets,
  COUNT(DISTINCT ad_id) as active_ads,
  CASE 
    WHEN SUM(amount_spent) > 0 
    THEN SUM(purchase_roas * amount_spent) / SUM(amount_spent)
    ELSE 0 
  END as account_avg_roas
FROM v_ad_performance_data 
WHERE day >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;