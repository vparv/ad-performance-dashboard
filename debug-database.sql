-- Check what's actually in your database
-- Run these queries in Supabase SQL Editor

-- 1. Check total record count
SELECT COUNT(*) as total_records FROM v_ad_performance_data;

-- 2. Check unique days in database
SELECT 
  day, 
  COUNT(*) as records_per_day
FROM v_ad_performance_data 
GROUP BY day 
ORDER BY day DESC;

-- 3. Check for NULL or empty day fields
SELECT 
  COUNT(*) as records_with_null_or_empty_day
FROM v_ad_performance_data 
WHERE day IS NULL OR day = '';

-- 4. Check sample data
SELECT 
  day, 
  campaign_name, 
  amount_spent,
  created_at
FROM v_ad_performance_data 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check date range
SELECT 
  MIN(day) as earliest_day,
  MAX(day) as latest_day,
  COUNT(DISTINCT day) as unique_days
FROM v_ad_performance_data;