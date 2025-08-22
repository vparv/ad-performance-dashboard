-- Find "sticker drop 2 - women scaling" performance on 8/16
-- Run this in Supabase SQL Editor

SELECT 
  campaign_name,
  day,
  ad_set_name,
  ad_name,
  platform,
  placement,
  amount_spent,
  results,
  purchase_roas,
  impressions,
  ctr_all
FROM v_ad_performance_data 
WHERE campaign_name ILIKE '%sticker drop 2 - women scaling%'
  AND day = '2025-08-16'  -- or '2024-08-16' depending on your date format
ORDER BY amount_spent DESC;

-- Alternative: if date format is different
SELECT 
  campaign_name,
  day,
  SUM(amount_spent) as total_spend,
  SUM(results) as total_results,
  AVG(purchase_roas) as avg_roas,
  SUM(impressions) as total_impressions
FROM v_ad_performance_data 
WHERE campaign_name ILIKE '%sticker drop 2%'
  AND (day LIKE '%08-16%' OR day LIKE '%8/16%' OR day = '2024-08-16')
GROUP BY campaign_name, day
ORDER BY day DESC;