'use client';

import { useState, useMemo } from 'react';
import { AdPerformanceData } from '@/types/adData';
import { aggregateByCampaign, aggregateByAdSet } from '@/utils/csvParser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  data: AdPerformanceData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyDetailed = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

const generateCampaignUrl = (campaignId: string) => {
  // Get current date and 3 days ago for the date range (4 days total like in your example)
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3); // -3 for 4 total days (2025-08-17 to 2025-08-20)
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const dateRange = `${formatDate(threeDaysAgo)}_${formatDate(today)}`;
  
  return `https://adsmanager.facebook.com/adsmanager/manage/adsets?act=604804066640450&business_id=1084628270319068&nav_entry_point=ads_ecosystem_navigation_menu&date=${dateRange}&comparison_date=&insights_date=${dateRange}&insights_comparison_date=&selected_campaign_ids=${campaignId}&nav_source=ads_manager`;
};

const generateAdSetUrl = (adSetId: string) => {
  // Get current date and 3 days ago for the date range (4 days total like in your example)
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3); // -3 for 4 total days (2025-08-17 to 2025-08-20)
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const dateRange = `${formatDate(threeDaysAgo)}_${formatDate(today)}`;
  
  return `https://adsmanager.facebook.com/adsmanager/manage/ads?act=604804066640450&business_id=1084628270319068&nav_entry_point=ads_ecosystem_navigation_menu&date=${dateRange}&comparison_date=&insights_date=${dateRange}&insights_comparison_date=&selected_adset_ids=${adSetId}&nav_source=ads_manager`;
};

interface SortConfig {
  column: 'spend' | 'results' | 'roas' | 'ctr' | null;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  spendMin: number | null;
  roasMin: number | null;
  roasMax: number | null;
  dateStart: string | null;
  dateEnd: string | null;
}

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'adsets' | 'ads' | 'daily'>('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);
  const [showPlatformColumn, setShowPlatformColumn] = useState(true);
  const [showPlacementColumn, setShowPlacementColumn] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'spend', direction: 'desc' });
  const [filters, setFilters] = useState<FilterConfig>({
    spendMin: null,
    roasMin: null,
    roasMax: null,
    dateStart: null,
    dateEnd: null
  });

  // Helper function for filtering raw data (with date field)
  const filterData = <T extends { totalSpend?: number; amountSpent?: number; avgRoas?: number; purchaseRoas?: number; day?: string; reportingStarts?: string; reportingEnds?: string; starts?: string; ends?: string }>(
    data: T[], 
    filterConfig: FilterConfig
  ): T[] => {
    return data.filter(item => {
      // Get spend value
      const spend = item.totalSpend || item.amountSpent || 0;
      
      // Get ROAS value
      const roas = item.avgRoas || item.purchaseRoas || 0;
      
      // For daily data, use the 'day' field; for aggregated data, use reporting ranges
      const itemDate = item.day;
      
      // Apply date filters
      if (filterConfig.dateStart || filterConfig.dateEnd) {
        // Skip items without date information
        if (!itemDate) {
          return false;
        }
        
        // For daily data, simply check if the day falls within the filter range
        if (filterConfig.dateStart && itemDate < filterConfig.dateStart) {
          return false;
        }
        
        if (filterConfig.dateEnd && itemDate > filterConfig.dateEnd) {
          return false;
        }
      }
      
      // Apply spend filter
      if (filterConfig.spendMin !== null && spend < filterConfig.spendMin) {
        return false;
      }
      
      // Apply ROAS min filter
      if (filterConfig.roasMin !== null && roas < filterConfig.roasMin) {
        return false;
      }
      
      // Apply ROAS max filter
      if (filterConfig.roasMax !== null && roas > filterConfig.roasMax) {
        return false;
      }
      
      return true;
    });
  };

  // Helper function for filtering aggregated data (without date field, already date-filtered)
  const filterAggregatedData = <T extends { totalSpend?: number; amountSpent?: number; avgRoas?: number; purchaseRoas?: number }>(
    data: T[], 
    filterConfig: FilterConfig
  ): T[] => {
    return data.filter(item => {
      // Get spend value
      const spend = item.totalSpend || item.amountSpent || 0;
      
      // Get ROAS value
      const roas = item.avgRoas || item.purchaseRoas || 0;
      
      // Apply spend filter
      if (filterConfig.spendMin !== null && spend < filterConfig.spendMin) {
        return false;
      }
      
      // Apply ROAS min filter
      if (filterConfig.roasMin !== null && roas < filterConfig.roasMin) {
        return false;
      }
      
      // Apply ROAS max filter
      if (filterConfig.roasMax !== null && roas > filterConfig.roasMax) {
        return false;
      }
      
      return true;
    });
  };

  const filteredBaseData = useMemo(() => filterData(data, { spendMin: null, roasMin: null, roasMax: null, dateStart: filters.dateStart, dateEnd: filters.dateEnd }), [data, filters.dateStart, filters.dateEnd]);
  
  const campaigns = useMemo(() => aggregateByCampaign(filteredBaseData), [filteredBaseData]);
  const adSets = useMemo(() => aggregateByAdSet(filteredBaseData), [filteredBaseData]);

  // Aggregate data by day
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, any>();
    
    filteredBaseData.forEach(row => {
      const day = row.day;
      if (!day) return;
      
      if (!dayMap.has(day)) {
        dayMap.set(day, {
          day,
          totalSpend: 0,
          totalResults: 0,
          totalImpressions: 0,
          totalReach: 0,
          campaignCount: new Set(),
          adSetCount: new Set(),
          adCount: new Set(),
        });
      }
      
      const dayData = dayMap.get(day)!;
      dayData.totalSpend += row.amountSpent;
      dayData.totalResults += row.results;
      dayData.totalImpressions += row.impressions;
      dayData.totalReach += row.reach;
      dayData.campaignCount.add(row.campaignId);
      dayData.adSetCount.add(row.adSetId);
      dayData.adCount.add(row.adId);
    });
    
    // Convert sets to counts and calculate averages
    const dailyArray = Array.from(dayMap.values()).map(day => ({
      ...day,
      campaignCount: day.campaignCount.size,
      adSetCount: day.adSetCount.size,
      adCount: day.adCount.size,
      avgRoas: day.totalSpend > 0 ? 
        filteredBaseData
          .filter(row => row.day === day.day)
          .reduce((sum, ad) => sum + (ad.purchaseRoas * ad.amountSpent), 0) / day.totalSpend : 0,
      avgCtr: day.totalSpend > 0 ? 
        filteredBaseData
          .filter(row => row.day === day.day)
          .reduce((sum, ad) => sum + (ad.ctrAll * ad.amountSpent), 0) / day.totalSpend : 0,
      costPerResult: day.totalResults > 0 ? day.totalSpend / day.totalResults : 0,
    }));
    
    return dailyArray.sort((a, b) => b.day.localeCompare(a.day)); // Sort by date descending
  }, [filteredBaseData]);

  // Filtered data based on selections
  const filteredAdSets = useMemo(() => {
    if (!selectedCampaign) return adSets;
    return adSets.filter(adSet => adSet.campaignId === selectedCampaign);
  }, [adSets, selectedCampaign]);

  const filteredAds = useMemo(() => {
    let baseData;
    if (selectedAdSet) {
      baseData = filteredBaseData.filter(ad => ad.adSetId === selectedAdSet);
    } else if (selectedCampaign) {
      baseData = filteredBaseData.filter(ad => ad.campaignId === selectedCampaign);
    } else {
      baseData = filteredBaseData;
    }
    // Filter out placement rows with zero spend
    return baseData.filter(ad => ad.amountSpent > 0);
  }, [filteredBaseData, selectedCampaign, selectedAdSet]);

  // Aggregate ads by unique Ad ID for cleaner display
  const aggregatedAds = useMemo(() => {
    const adMap = new Map();
    
    filteredAds.forEach(ad => {
      const existing = adMap.get(ad.adId);
      if (!existing) {
        adMap.set(ad.adId, {
          ...ad,
          totalSpend: ad.amountSpent,
          totalResults: ad.results,
          totalImpressions: ad.impressions,
          totalReach: ad.reach,
          placements: [ad.placement],
          platforms: [ad.platform],
          statuses: [ad.deliveryStatus]
        });
      } else {
        existing.totalSpend += ad.amountSpent;
        existing.totalResults += ad.results;
        existing.totalImpressions += ad.impressions;
        existing.totalReach += ad.reach;
        if (!existing.placements.includes(ad.placement)) {
          existing.placements.push(ad.placement);
        }
        if (!existing.platforms.includes(ad.platform)) {
          existing.platforms.push(ad.platform);
        }
        if (!existing.statuses.includes(ad.deliveryStatus)) {
          existing.statuses.push(ad.deliveryStatus);
        }
        
        // Use most favorable status (active > not_delivering > inactive > archived)
        const statusPriority = { 'active': 4, 'not_delivering': 3, 'inactive': 2, 'archived': 1 };
        const currentPriority = statusPriority[existing.deliveryStatus] || 0;
        const newPriority = statusPriority[ad.deliveryStatus] || 0;
        if (newPriority > currentPriority) {
          existing.deliveryStatus = ad.deliveryStatus;
        }
        
        // Recalculate weighted averages
        existing.purchaseRoas = existing.totalSpend > 0 ? 
          (existing.purchaseRoas * existing.amountSpent + ad.purchaseRoas * ad.amountSpent) / existing.totalSpend : 0;
        existing.ctrAll = existing.totalSpend > 0 ? 
          (existing.ctrAll * existing.amountSpent + ad.ctrAll * ad.amountSpent) / existing.totalSpend : 0;
        
        existing.amountSpent = existing.totalSpend;
        existing.results = existing.totalResults;
        existing.impressions = existing.totalImpressions;
        existing.reach = existing.totalReach;
      }
    });
    
    return Array.from(adMap.values());
  }, [filteredAds]);

  const handleCampaignClick = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setSelectedAdSet(null);
    setActiveTab('adsets');
  };

  const handleAdSetClick = (adSetId: string) => {
    setSelectedAdSet(adSetId);
    setActiveTab('ads');
  };

  const handleBackClick = () => {
    if (selectedAdSet) {
      setSelectedAdSet(null);
      setActiveTab('adsets');
    } else if (selectedCampaign) {
      setSelectedCampaign(null);
      setActiveTab('campaigns');
    }
  };

  const resetFilters = () => {
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    setActiveTab('overview');
  };

  const handleSort = (column: 'spend' | 'results' | 'roas' | 'ctr') => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortData = <T extends { totalSpend?: number; amountSpent?: number; totalResults?: number; results?: number; avgRoas?: number; purchaseRoas?: number; avgCtr?: number; ctrAll?: number; deliveryStatus?: string }>(
    data: T[], 
    config: SortConfig
  ): T[] => {
    return [...data].sort((a, b) => {
      // First priority: Always show active items first
      const aIsActive = a.deliveryStatus === 'active';
      const bIsActive = b.deliveryStatus === 'active';
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      // Second priority: Apply column sorting within same status group
      if (!config.column) return 0;

      let aValue = 0;
      let bValue = 0;

      switch (config.column) {
        case 'spend':
          aValue = a.totalSpend || a.amountSpent || 0;
          bValue = b.totalSpend || b.amountSpent || 0;
          break;
        case 'results':
          aValue = a.totalResults || a.results || 0;
          bValue = b.totalResults || b.results || 0;
          break;
        case 'roas':
          aValue = a.avgRoas || a.purchaseRoas || 0;
          bValue = b.avgRoas || b.purchaseRoas || 0;
          break;
        case 'ctr':
          aValue = a.avgCtr || a.ctrAll || 0;
          bValue = b.avgCtr || b.ctrAll || 0;
          break;
      }

      return config.direction === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  const SortableHeader = ({ column, children }: { column: 'spend' | 'results' | 'roas' | 'ctr'; children: React.ReactNode }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <span className={`text-xs ${sortConfig.column === column && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}>▲</span>
          <span className={`text-xs ${sortConfig.column === column && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}>▼</span>
        </div>
      </div>
    </th>
  );

  const summary = useMemo(() => {
    const totalSpend = filteredBaseData.reduce((sum, ad) => sum + ad.amountSpent, 0);
    const totalResults = filteredBaseData.reduce((sum, ad) => sum + ad.results, 0);
    const totalImpressions = filteredBaseData.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalReach = filteredBaseData.reduce((sum, ad) => sum + ad.reach, 0);
    const avgRoas = totalSpend > 0 ? filteredBaseData.reduce((sum, ad) => sum + (ad.purchaseRoas * ad.amountSpent), 0) / totalSpend : 0;
    const avgCtr = totalSpend > 0 ? filteredBaseData.reduce((sum, ad) => sum + (ad.ctrAll * ad.amountSpent), 0) / totalSpend : 0;

    // Get date range from the filtered data or use filter dates
    let startDate = '';
    let endDate = '';
    
    if (filters.dateStart || filters.dateEnd) {
      // If user has set date filters, show those
      startDate = filters.dateStart || '';
      endDate = filters.dateEnd || '';
    } else {
      // For daily data, show the actual range from 'day' field
      const days = filteredBaseData.map(ad => ad.day).filter(date => date);
      if (days.length > 0) {
        startDate = days.reduce((min, date) => date < min ? date : min);
        endDate = days.reduce((max, date) => date > max ? date : max);
      } else {
        // Fallback to reporting dates for aggregated data
        const dates = filteredBaseData.map(ad => ad.reportingStarts).filter(date => date);
        startDate = dates.length > 0 ? dates.reduce((min, date) => date < min ? date : min) : '';
        endDate = filteredBaseData.map(ad => ad.reportingEnds).filter(date => date).reduce((max, date) => date > max ? date : max, '');
      }
    }

    return {
      totalSpend,
      totalResults,
      totalImpressions,
      totalReach,
      avgRoas,
      avgCtr,
      costPerResult: totalResults > 0 ? totalSpend / totalResults : 0,
      uniqueCampaigns: campaigns.length,
      uniqueAdSets: adSets.length,
      totalAds: new Set(filteredBaseData.map(ad => ad.adId)).size,
      dateRange: startDate && endDate ? `${startDate} - ${endDate}` : '',
    };
  }, [filteredBaseData, campaigns, adSets, filters.dateStart, filters.dateEnd]);

  const topCampaignChartData = campaigns.slice(0, 10).map(campaign => ({
    name: campaign.campaignName.substring(0, 30) + (campaign.campaignName.length > 30 ? '...' : ''),
    spend: campaign.totalSpend,
    roas: campaign.avgRoas,
    ctr: campaign.avgCtr,
  }));

  const platformData = useMemo(() => {
    const platformStats = filteredBaseData.reduce((acc, ad) => {
      if (!acc[ad.platform]) {
        acc[ad.platform] = { platform: ad.platform, spend: 0, results: 0 };
      }
      acc[ad.platform].spend += ad.amountSpent;
      acc[ad.platform].results += ad.results;
      return acc;
    }, {} as Record<string, { platform: string; spend: number; results: number }>);

    return Object.values(platformStats);
  }, [filteredBaseData]);

  return (
    <div className="space-y-6">
      {/* Date Range Display */}
      {summary.dateRange && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center">
            <div className="text-blue-800">
              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Reporting Period:</span>
              <span className="ml-2 font-semibold">{summary.dateRange}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 mb-0">Filters</h3>
          <button
            onClick={() => setFilters({ spendMin: null, roasMin: null, roasMax: null, dateStart: null, dateEnd: null })}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded transition-colors"
          >
            Clear All
          </button>
        </div>
        <div className="flex items-center flex-wrap gap-6 mt-3">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-600">From</label>
            <input
              type="date"
              value={filters.dateStart || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateStart: e.target.value || null 
              }))}
              className="px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <label className="text-xs font-medium text-gray-600">To</label>
            <input
              type="date"
              value={filters.dateEnd || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateEnd: e.target.value || null 
              }))}
              className="px-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Spend Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-600">Spend ≥</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input
                type="number"
                placeholder="0"
                value={filters.spendMin || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  spendMin: e.target.value ? Number(e.target.value) : null 
                }))}
                className="pl-6 pr-3 py-1 text-xs border border-gray-300 rounded w-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* ROAS Min Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-600">ROAS ≥</label>
            <input
              type="number"
              step="0.1"
              placeholder="0.0"
              value={filters.roasMin || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                roasMin: e.target.value ? Number(e.target.value) : null 
              }))}
              className="px-3 py-1 text-xs border border-gray-300 rounded w-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ROAS Max Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-600">ROAS ≤</label>
            <input
              type="number"
              step="0.1"
              placeholder="∞"
              value={filters.roasMax || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                roasMax: e.target.value ? Number(e.target.value) : null 
              }))}
              className="px-3 py-1 text-xs border border-gray-300 rounded w-20 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Active Filters Display */}
          {(filters.dateStart || filters.dateEnd || filters.spendMin || filters.roasMin || filters.roasMax) && (
            <div className="flex items-center flex-wrap gap-2 ml-4 pl-4 border-l border-gray-200">
              <span className="text-xs text-gray-500">Active:</span>
              {(filters.dateStart || filters.dateEnd) && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                  {filters.dateStart || 'Start'} → {filters.dateEnd || 'End'}
                </span>
              )}
              {filters.spendMin && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  Spend ≥ ${filters.spendMin}
                </span>
              )}
              {filters.roasMin && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  ROAS ≥ {filters.roasMin}
                </span>
              )}
              {filters.roasMax && (
                <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                  ROAS ≤ {filters.roasMax}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {(selectedCampaign || selectedAdSet) && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
          <button 
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            All Campaigns
          </button>
          {selectedCampaign && (
            <>
              <span>→</span>
              <button 
                onClick={handleBackClick}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {campaigns.find(c => c.campaignId === selectedCampaign)?.campaignName || 'Campaign'}
              </button>
            </>
          )}
          {selectedAdSet && (
            <>
              <span>→</span>
              <span className="font-medium text-gray-900">
                {adSets.find(a => a.adSetId === selectedAdSet)?.adSetName || 'Ad Set'}
              </span>
            </>
          )}
          <button
            onClick={handleBackClick}
            className="ml-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'daily', label: 'Daily' },
            { key: 'campaigns', label: 'Campaigns' },
            { key: 'adsets', label: 'Ad Sets' },
            { key: 'ads', label: 'Ads' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as 'overview' | 'campaigns' | 'adsets' | 'ads' | 'daily');
                // Clear selections when clicking tabs to reset breadcrumb
                if (tab.key === 'adsets') {
                  setSelectedAdSet(null);
                } else if (tab.key === 'campaigns') {
                  setSelectedCampaign(null);
                  setSelectedAdSet(null);
                } else if (tab.key === 'overview') {
                  setSelectedCampaign(null);
                  setSelectedAdSet(null);
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalSpend)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Results</h3>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalResults)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Average ROAS</h3>
              <p className="text-2xl font-bold text-gray-900">{summary.avgRoas.toFixed(2)}x</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Average CTR</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercent(summary.avgCtr)}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Campaigns by Spend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top 10 Campaigns by Spend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCampaignChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="spend" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Platform Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Spend by Platform</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="spend"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.platform}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Account Summary */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.uniqueCampaigns}</p>
                <p className="text-sm text-gray-500">Campaigns</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{summary.uniqueAdSets}</p>
                <p className="text-sm text-gray-500">Ad Sets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{summary.totalAds}</p>
                <p className="text-sm text-gray-500">Ads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{formatNumber(summary.totalImpressions)}</p>
                <p className="text-sm text-gray-500">Impressions</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  <SortableHeader column="spend">Spend</SortableHeader>
                  <SortableHeader column="results">Results</SortableHeader>
                  <SortableHeader column="roas">ROAS</SortableHeader>
                  <SortableHeader column="ctr">CTR</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Sets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(filterAggregatedData(campaigns, filters), sortConfig).map((campaign, index) => (
                  <tr 
                    key={`${campaign.campaignId}-${index}`} 
                    className={`${
                      campaign.avgRoas >= 2.0 
                        ? 'bg-green-50 hover:bg-green-100' 
                        : campaign.avgRoas <= 1.0
                        ? 'bg-red-50 hover:bg-red-100'
                        : campaign.avgRoas > 1.0 && campaign.avgRoas < 2.0
                        ? 'bg-yellow-50 hover:bg-yellow-100'
                        : index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                    } cursor-pointer transition-colors`}
                    onClick={() => handleCampaignClick(campaign.campaignId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.campaignName}</div>
                          <div className="text-sm text-gray-500">ID: {campaign.campaignId}</div>
                        </div>
                        <a
                          href={generateCampaignUrl(campaign.campaignId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="Open in Facebook Ads Manager"
                        >
                          <svg 
                            className="w-3 h-3 mr-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(campaign.totalSpend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(campaign.totalResults)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.avgRoas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(campaign.avgCtr)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyDetailed(campaign.costPerResult)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.adSetCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.adCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'adsets' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Ad Set Performance
              {selectedCampaign && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredAdSets.length} ad sets)
                </span>
              )}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Set</th>
                  <SortableHeader column="spend">Spend</SortableHeader>
                  <SortableHeader column="results">Results</SortableHeader>
                  <SortableHeader column="roas">ROAS</SortableHeader>
                  <SortableHeader column="ctr">CTR</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(filterAggregatedData(filteredAdSets, filters), sortConfig).slice(0, 50).map((adSet, index) => (
                  <tr 
                    key={`${adSet.adSetId}-${index}`} 
                    className={`${
                      adSet.avgRoas >= 2.0 
                        ? 'bg-green-50 hover:bg-green-100' 
                        : adSet.avgRoas <= 1.0
                        ? 'bg-red-50 hover:bg-red-100'
                        : adSet.avgRoas > 1.0 && adSet.avgRoas < 2.0
                        ? 'bg-yellow-50 hover:bg-yellow-100'
                        : index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
                    } cursor-pointer transition-colors`}
                    onClick={() => handleAdSetClick(adSet.adSetId)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{adSet.adSetName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {!selectedCampaign && (
                              <div>Campaign: {adSet.campaignName}</div>
                            )}
                            <div>ID: {adSet.adSetId}</div>
                          </div>
                        </div>
                        <a
                          href={generateAdSetUrl(adSet.adSetId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          title="Open in Facebook Ads Manager"
                        >
                          <svg 
                            className="w-3 h-3 mr-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(adSet.totalSpend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(adSet.totalResults)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {adSet.avgRoas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(adSet.avgCtr)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyDetailed(adSet.costPerResult)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {adSet.adCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Individual Ad Performance
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({aggregatedAds.length} unique ads{filteredAds.length !== aggregatedAds.length ? `, ${filteredAds.length} total rows` : ''})
                  </span>
                </h3>
                {!selectedCampaign && !selectedAdSet && (
                  <p className="text-sm text-gray-500 mt-1">Showing top 100 ads by spend</p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <button
                    onClick={() => setShowPlatformColumn(!showPlatformColumn)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      showPlatformColumn 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Platform
                  </button>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => setShowPlacementColumn(!showPlacementColumn)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      showPlacementColumn 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Placement
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
                  <SortableHeader column="spend">Spend</SortableHeader>
                  <SortableHeader column="results">Results</SortableHeader>
                  <SortableHeader column="roas">ROAS</SortableHeader>
                  <SortableHeader column="ctr">CTR</SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {showPlatformColumn && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  )}
                  {showPlacementColumn && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Placement</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortData(filterAggregatedData(aggregatedAds, filters), sortConfig)
                  .slice(0, selectedCampaign || selectedAdSet ? 500 : 100)
                  .map((ad, index) => (
                  <tr 
                    key={`${ad.adId}-${index}`} 
                    className={
                      ad.purchaseRoas >= 2.0 
                        ? 'bg-green-50' 
                        : ad.purchaseRoas <= 1.0
                        ? 'bg-red-50'
                        : ad.purchaseRoas > 1.0 && ad.purchaseRoas < 2.0
                        ? 'bg-yellow-50'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ad.adName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {!selectedCampaign && (
                          <div>Campaign: {ad.campaignName}</div>
                        )}
                        {!selectedAdSet && (
                          <div>Ad Set: {ad.adSetName}</div>
                        )}
                        <div>ID: {ad.adId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(ad.amountSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(ad.results)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ad.purchaseRoas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(ad.ctrAll)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ad.deliveryStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ad.deliveryStatus}
                      </span>
                    </td>
                    {showPlatformColumn && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {ad.platforms.map((platform: string, i: number) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {platform}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    {showPlacementColumn && (
                      <td className="px-6 py-4 text-right">
                        <div className="text-xs text-gray-600 space-y-1 max-w-[120px] ml-auto">
                          {ad.placements.slice(0, 4).map((placement: string, i: number) => (
                            <div key={i} className="truncate">
                              {placement.length > 15 ? placement.substring(0, 15) + '...' : placement}
                            </div>
                          ))}
                          {ad.placements.length > 4 && (
                            <div className="text-gray-400 italic">+{ad.placements.length - 4} more</div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Daily Performance
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({dailyData.length} days)
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaigns</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Sets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filterAggregatedData(dailyData, filters)
                  .sort((a, b) => b.day.localeCompare(a.day)) // Always sort by newest date first
                  .map((day, index) => (
                  <tr 
                    key={day.day} 
                    className={
                      day.avgRoas >= 2.0 
                        ? 'bg-green-50' 
                        : day.avgRoas <= 1.0
                        ? 'bg-red-50'
                        : day.avgRoas > 1.0 && day.avgRoas < 2.0
                        ? 'bg-yellow-50'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(day.day + 'T00:00:00').toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-500">{day.day}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(day.totalSpend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(day.totalResults)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.avgRoas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercent(day.avgCtr)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrencyDetailed(day.costPerResult)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(day.totalImpressions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.campaignCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.adSetCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.adCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}