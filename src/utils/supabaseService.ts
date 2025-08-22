import { supabase } from '@/lib/supabase';
import { AdPerformanceData } from '@/types/adData';
import type { AdPerformanceInsert } from '@/lib/supabase';

// Convert our AdPerformanceData to Supabase insert format
const convertToSupabaseFormat = (data: AdPerformanceData): AdPerformanceInsert => ({
  campaign_name: data.campaignName,
  campaign_id: data.campaignId,
  ad_set_name: data.adSetName,
  ad_set_id: data.adSetId,
  ad_name: data.adName,
  ad_id: data.adId,
  placement: data.placement,
  platform: data.platform,
  delivery_status: data.deliveryStatus,
  delivery_level: data.deliveryLevel,
  reach: data.reach,
  impressions: data.impressions,
  frequency: data.frequency,
  results: data.results,
  amount_spent: data.amountSpent,
  cost_per_result: data.costPerResult,
  purchase_roas: data.purchaseRoas,
  ctr_all: data.ctrAll,
  result_rate: data.resultRate,
  starts: data.starts,
  ends: data.ends,
  reporting_starts: data.reportingStarts,
  reporting_ends: data.reportingEnds,
  day: data.day,
  attribution_setting: data.attributionSetting,
  result_type: data.resultType,
});

// Convert Supabase row back to our AdPerformanceData format
const convertFromSupabaseFormat = (row: Record<string, unknown>): AdPerformanceData => ({
  campaignName: String(row.campaign_name || ''),
  campaignId: String(row.campaign_id || ''),
  adSetName: String(row.ad_set_name || ''),
  adSetId: String(row.ad_set_id || ''),
  adName: String(row.ad_name || ''),
  adId: String(row.ad_id || ''),
  placement: String(row.placement || ''),
  platform: String(row.platform || ''),
  deliveryStatus: String(row.delivery_status || ''),
  deliveryLevel: String(row.delivery_level || ''),
  reach: Number(row.reach) || 0,
  impressions: Number(row.impressions) || 0,
  frequency: Number(row.frequency) || 0,
  results: Number(row.results) || 0,
  amountSpent: Number(row.amount_spent) || 0,
  costPerResult: Number(row.cost_per_result) || 0,
  purchaseRoas: Number(row.purchase_roas) || 0,
  ctrAll: Number(row.ctr_all) || 0,
  resultRate: Number(row.result_rate) || 0,
  starts: String(row.starts || ''),
  ends: String(row.ends || ''),
  reportingStarts: String(row.reporting_starts || ''),
  reportingEnds: String(row.reporting_ends || ''),
  day: String(row.day || ''),
  attributionSetting: String(row.attribution_setting || ''),
  resultType: String(row.result_type || ''),
});

export interface UploadResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
  message: string;
}

// Save ad performance data to Supabase with upsert functionality
export async function saveAdPerformanceData(data: AdPerformanceData[]): Promise<UploadResult> {
  try {
    console.log('💾 saveAdPerformanceData called with', data.length, 'records');
    const result: UploadResult = {
      success: true,
      inserted: 0,
      updated: 0,
      errors: [],
      message: ''
    };

    if (data.length === 0) {
      console.log('❌ No data to save');
      result.message = 'No data to save';
      return result;
    }

    // Convert data to Supabase format
    console.log('🔄 Converting data to Supabase format...');
    const supabaseData = data.map(convertToSupabaseFormat);
    console.log('✅ Converted sample:', supabaseData[0]);

    // Use upsert with conflict resolution on our unique constraint
    console.log('📤 Sending to Supabase...');
    const { data: upsertedData, error } = await supabase
      .from('v_ad_performance_data')
      .upsert(supabaseData, {
        onConflict: 'ad_id,day,placement,platform',
        ignoreDuplicates: false // This ensures updates happen on conflicts
      })
      .select('id');

    if (error) {
      console.error('❌ Supabase upsert error:', error);
      result.success = false;
      result.errors.push(`Database error: ${error.message}`);
      result.message = 'Failed to save data to database';
      return result;
    }

    console.log('✅ Supabase upsert successful:', upsertedData?.length, 'records');

    // For simplicity, we'll count all as inserted (Supabase doesn't distinguish in upsert response)
    result.inserted = upsertedData?.length || 0;
    result.message = `Successfully processed ${result.inserted} records`;

    return result;

  } catch (error) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      message: 'Failed to save data'
    };
  }
}

// Get all ad performance data from Supabase
export async function getAdPerformanceData(options?: {
  startDate?: string;
  endDate?: string;
  campaignIds?: string[];
  limit?: number;
}): Promise<AdPerformanceData[]> {
  try {
    let query = supabase
      .from('v_ad_performance_data')
      .select('*')
      .order('day', { ascending: false });

    // Apply date filters
    if (options?.startDate) {
      query = query.gte('day', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('day', options.endDate);
    }

    // Apply campaign filters
    if (options?.campaignIds && options.campaignIds.length > 0) {
      query = query.in('campaign_id', options.campaignIds);
    }

    // Supabase has a hard 1000 record limit, so we need to use pagination to get all data
    let allData: Record<string, unknown>[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log('📊 Executing paginated query for date range:', options?.startDate, 'to', options?.endDate);

    while (hasMore) {
      const { data: pageData, error } = await query
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching ad performance data:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`📄 Page ${Math.floor(from/pageSize) + 1}: fetched ${pageData?.length || 0} records`);

      if (!pageData || pageData.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(pageData);
        from += pageSize;
        
        // If we got less than a full page, we're done
        if (pageData.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log('✅ Total records fetched:', allData.length);

    return allData.map(convertFromSupabaseFormat);

  } catch (error) {
    console.error('Error in getAdPerformanceData:', error);
    throw error;
  }
}

// Get unique dates available in the database
export async function getAvailableDates(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('v_ad_performance_data')
      .select('day')
      .order('day', { ascending: false });

    if (error) {
      console.error('Error fetching available dates:', error);
      return [];
    }

    // Get unique dates
    const uniqueDates = [...new Set((data || []).map(row => row.day))];
    return uniqueDates.sort().reverse(); // Most recent first

  } catch (error) {
    console.error('Error in getAvailableDates:', error);
    return [];
  }
}

// Get data for incremental loading (only new data since last import)
export async function getIncrementalData(newData: AdPerformanceData[]): Promise<AdPerformanceData[]> {
  try {
    console.log('🔍 getIncrementalData called with', newData.length, 'records');
    if (newData.length === 0) return newData;

    // Get unique combinations of ad_id, day, placement, platform from new data
    const dataKeys = newData.map(item => ({
      ad_id: item.adId,
      day: item.day,
      placement: item.placement,
      platform: item.platform
    }));
    console.log('🔑 Checking keys:', dataKeys.slice(0, 3));

    // Check which records already exist
    const existingRecords = new Set<string>();
    
    // For first upload or empty database, skip the expensive check
    const { count } = await supabase
      .from('v_ad_performance_data')
      .select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      console.log('📊 Database is empty, all records are new');
      return newData;
    }
    
    console.log('🔍 Database has', count, 'existing records, checking for duplicates...');
    
    // Get all existing combinations in one query (much faster)
    const { data: existingData, error: existingError } = await supabase
      .from('v_ad_performance_data')
      .select('ad_id, day, placement, platform');
    
    if (existingError) {
      console.error('❌ Error checking existing data:', existingError);
      // If we can't check, return all data to be safe
      return newData;
    }
    
    // Build set of existing keys
    if (existingData) {
      existingData.forEach(row => {
        existingRecords.add(`${row.ad_id}-${row.day}-${row.placement}-${row.platform}`);
      });
    }
    
    console.log('✅ Found', existingRecords.size, 'existing record combinations');

    // Filter out existing records
    const incrementalData = newData.filter(item => {
      const key = `${item.adId}-${item.day}-${item.placement}-${item.platform}`;
      return !existingRecords.has(key);
    });

    console.log('📊 Incremental filtering result:', {
      total: newData.length,
      existing: existingRecords.size,
      new: incrementalData.length
    });

    return incrementalData;

  } catch (error) {
    console.error('Error in getIncrementalData:', error);
    // If there's an error checking existing data, return all new data to be safe
    return newData;
  }
}

// Get summary statistics
export async function getDatabaseSummary(): Promise<{
  totalRecords: number;
  dateRange: { start: string; end: string } | null;
  campaignCount: number;
  adSetCount: number;
  adCount: number;
}> {
  try {
    // Get total records
    const { count: totalRecords } = await supabase
      .from('v_ad_performance_data')
      .select('*', { count: 'exact', head: true });

    // Get date range
    const { data: dateData } = await supabase
      .from('v_ad_performance_data')
      .select('day')
      .order('day', { ascending: true })
      .limit(1);

    const { data: maxDateData } = await supabase
      .from('v_ad_performance_data')
      .select('day')
      .order('day', { ascending: false })
      .limit(1);

    const dateRange = dateData && maxDateData && dateData.length > 0 && maxDateData.length > 0
      ? { start: dateData[0].day, end: maxDateData[0].day }
      : null;

    // Get unique counts by fetching all distinct values
    const { data: campaignData } = await supabase
      .from('v_ad_performance_data')
      .select('campaign_id')
      .not('campaign_id', 'is', null);

    const { data: adSetData } = await supabase
      .from('v_ad_performance_data')
      .select('ad_set_id')
      .not('ad_set_id', 'is', null);

    const { data: adData } = await supabase
      .from('v_ad_performance_data')
      .select('ad_id')
      .not('ad_id', 'is', null);

    // Count unique values
    const uniqueCampaigns = new Set(campaignData?.map(row => row.campaign_id) || []);
    const uniqueAdSets = new Set(adSetData?.map(row => row.ad_set_id) || []);
    const uniqueAds = new Set(adData?.map(row => row.ad_id) || []);

    return {
      totalRecords: totalRecords || 0,
      dateRange,
      campaignCount: uniqueCampaigns.size,
      adSetCount: uniqueAdSets.size,
      adCount: uniqueAds.size
    };

  } catch (error) {
    console.error('Error in getDatabaseSummary:', error);
    return {
      totalRecords: 0,
      dateRange: null,
      campaignCount: 0,
      adSetCount: 0,
      adCount: 0
    };
  }
}