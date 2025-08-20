import Papa from 'papaparse';
import { AdPerformanceData, CampaignSummary, AdSetSummary } from '@/types/adData';

// Helper function to safely parse numbers
const parseNumber = (value: string): number => {
  if (!value || value === '' || value === '-') return 0;
  const cleaned = value.replace(/[,$%]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to clean string values
const cleanString = (value: string): string => {
  return value?.trim()?.replace(/^"(.*)"$/, '$1') || '';
};

export const parseAdPerformanceCSV = (csvContent: string): Promise<AdPerformanceData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Remove BOM and clean header
        return header.replace(/^\uFEFF/, '').trim();
      },
      complete: (results) => {
        try {
          const data: AdPerformanceData[] = (results.data as Record<string, string>[]).map((row: Record<string, string>) => {
            return {
              campaignName: cleanString(row['Campaign name']),
              adSetName: cleanString(row['Ad set name']),
              campaignId: cleanString(row['Campaign ID']),
              placement: cleanString(row['Placement']),
              adName: cleanString(row['Ad name']),
              adSetId: cleanString(row['Ad set ID']),
              adId: cleanString(row['Ad ID']),
              platform: cleanString(row['Platform']),
              deliveryStatus: cleanString(row['Delivery status']),
              deliveryLevel: cleanString(row['Delivery level']),
              reach: parseNumber(row['Reach']),
              impressions: parseNumber(row['Impressions']),
              frequency: parseNumber(row['Frequency']),
              attributionSetting: cleanString(row['Attribution setting']),
              resultType: cleanString(row['Result Type']),
              results: parseNumber(row['Results']),
              amountSpent: parseNumber(row['Amount spent (USD)']),
              costPerResult: parseNumber(row['Cost per result']),
              starts: cleanString(row['Starts']),
              ends: cleanString(row['Ends']),
              purchaseRoas: parseNumber(row['Purchase ROAS (return on ad spend)']),
              ctrAll: parseNumber(row['CTR (all)']),
              resultRate: parseNumber(row['Result rate']),
              reportingStarts: cleanString(row['Reporting starts']),
              reportingEnds: cleanString(row['Reporting ends']),
              day: cleanString(row['Day']), // Add the daily date field
            };
          });

          // Filter out any rows with missing essential data
          const validData = data.filter(row => 
            row.campaignName && 
            row.adName && 
            row.campaignId
          );

          resolve(validData);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error}`));
        }
      },
      error: (error: Error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

// Aggregate data by campaign
export const aggregateByCampaign = (data: AdPerformanceData[]): CampaignSummary[] => {
  const campaignMap = new Map<string, CampaignSummary>();

  data.forEach(row => {
    const key = `${row.campaignId}-${row.campaignName}`;
    
    if (!campaignMap.has(key)) {
      campaignMap.set(key, {
        campaignName: row.campaignName,
        campaignId: row.campaignId,
        totalSpend: 0,
        totalResults: 0,
        totalImpressions: 0,
        totalReach: 0,
        avgRoas: 0,
        avgCtr: 0,
        costPerResult: 0,
        adCount: 0,
        adSetCount: 0,
        starts: row.starts,
        ends: row.ends,
      });
    }

    const campaign = campaignMap.get(key)!;
    campaign.totalSpend += row.amountSpent;
    campaign.totalResults += row.results;
    campaign.totalImpressions += row.impressions;
    campaign.totalReach += row.reach;
  });

  // Calculate averages and unique ad sets
  const campaigns = Array.from(campaignMap.values());
  
  campaigns.forEach(campaign => {
    const campaignAds = data.filter(row => row.campaignId === campaign.campaignId);
    const uniqueAdSets = new Set(campaignAds.map(row => row.adSetId));
    const uniqueAds = new Set(campaignAds.map(row => row.adId));
    
    campaign.adSetCount = uniqueAdSets.size;
    campaign.adCount = uniqueAds.size; // Fix: count unique ads, not total rows
    campaign.costPerResult = campaign.totalResults > 0 ? campaign.totalSpend / campaign.totalResults : 0;
    
    // Calculate weighted averages across all daily records
    const totalSpend = campaign.totalSpend;
    if (totalSpend > 0) {
      const totalRoasWeighted = campaignAds.reduce((sum, ad) => {
        // Only include valid ROAS values (not NaN or 0) in the weighted average
        const roas = isNaN(ad.purchaseRoas) ? 0 : ad.purchaseRoas;
        return sum + (roas * ad.amountSpent);
      }, 0);
      
      const totalCtrWeighted = campaignAds.reduce((sum, ad) => {
        // Only include valid CTR values (not NaN or 0) in the weighted average  
        const ctr = isNaN(ad.ctrAll) ? 0 : ad.ctrAll;
        return sum + (ctr * ad.amountSpent);
      }, 0);
      
      campaign.avgRoas = totalRoasWeighted / totalSpend;
      campaign.avgCtr = totalCtrWeighted / totalSpend;
    }
  });

  return campaigns.sort((a, b) => b.totalSpend - a.totalSpend);
};

// Aggregate data by ad set
export const aggregateByAdSet = (data: AdPerformanceData[]): AdSetSummary[] => {
  const adSetMap = new Map<string, AdSetSummary>();

  data.forEach(row => {
    const key = `${row.adSetId}-${row.adSetName}`;
    
    if (!adSetMap.has(key)) {
      adSetMap.set(key, {
        adSetName: row.adSetName,
        adSetId: row.adSetId,
        campaignName: row.campaignName,
        campaignId: row.campaignId,
        totalSpend: 0,
        totalResults: 0,
        totalImpressions: 0,
        totalReach: 0,
        avgRoas: 0,
        avgCtr: 0,
        costPerResult: 0,
        adCount: 0,
      });
    }

    const adSet = adSetMap.get(key)!;
    adSet.totalSpend += row.amountSpent;
    adSet.totalResults += row.results;
    adSet.totalImpressions += row.impressions;
    adSet.totalReach += row.reach;
  });

  // Calculate averages
  const adSets = Array.from(adSetMap.values());
  
  adSets.forEach(adSet => {
    const adSetAds = data.filter(row => row.adSetId === adSet.adSetId);
    const uniqueAds = new Set(adSetAds.map(row => row.adId));
    
    adSet.adCount = uniqueAds.size; // Fix: count unique ads, not total rows
    adSet.costPerResult = adSet.totalResults > 0 ? adSet.totalSpend / adSet.totalResults : 0;
    
    // Calculate weighted averages across all daily records
    const totalSpend = adSet.totalSpend;
    if (totalSpend > 0) {
      const totalRoasWeighted = adSetAds.reduce((sum, ad) => {
        // Only include valid ROAS values (not NaN or 0) in the weighted average
        const roas = isNaN(ad.purchaseRoas) ? 0 : ad.purchaseRoas;
        return sum + (roas * ad.amountSpent);
      }, 0);
      
      const totalCtrWeighted = adSetAds.reduce((sum, ad) => {
        // Only include valid CTR values (not NaN or 0) in the weighted average  
        const ctr = isNaN(ad.ctrAll) ? 0 : ad.ctrAll;
        return sum + (ctr * ad.amountSpent);
      }, 0);
      
      adSet.avgRoas = totalRoasWeighted / totalSpend;
      adSet.avgCtr = totalCtrWeighted / totalSpend;
    }
  });

  return adSets.sort((a, b) => b.totalSpend - a.totalSpend);
};