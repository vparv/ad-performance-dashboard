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

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'adsets' | 'ads'>('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<string | null>(null);

  const campaigns = useMemo(() => aggregateByCampaign(data), [data]);
  const adSets = useMemo(() => aggregateByAdSet(data), [data]);

  // Filtered data based on selections
  const filteredAdSets = useMemo(() => {
    if (!selectedCampaign) return adSets;
    return adSets.filter(adSet => adSet.campaignId === selectedCampaign);
  }, [adSets, selectedCampaign]);

  const filteredAds = useMemo(() => {
    let baseData;
    if (selectedAdSet) {
      baseData = data.filter(ad => ad.adSetId === selectedAdSet);
    } else if (selectedCampaign) {
      baseData = data.filter(ad => ad.campaignId === selectedCampaign);
    } else {
      baseData = data;
    }
    // Filter out placement rows with zero spend
    return baseData.filter(ad => ad.amountSpent > 0);
  }, [data, selectedCampaign, selectedAdSet]);

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

  const summary = useMemo(() => {
    const totalSpend = data.reduce((sum, ad) => sum + ad.amountSpent, 0);
    const totalResults = data.reduce((sum, ad) => sum + ad.results, 0);
    const totalImpressions = data.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalReach = data.reduce((sum, ad) => sum + ad.reach, 0);
    const avgRoas = totalSpend > 0 ? data.reduce((sum, ad) => sum + (ad.purchaseRoas * ad.amountSpent), 0) / totalSpend : 0;
    const avgCtr = totalSpend > 0 ? data.reduce((sum, ad) => sum + (ad.ctrAll * ad.amountSpent), 0) / totalSpend : 0;

    // Get date range from the data
    const dates = data.map(ad => ad.reportingStarts).filter(date => date);
    const startDate = dates.length > 0 ? dates.reduce((min, date) => date < min ? date : min) : '';
    const endDate = data.map(ad => ad.reportingEnds).filter(date => date).reduce((max, date) => date > max ? date : max, '');

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
      totalAds: new Set(data.map(ad => ad.adId)).size,
      dateRange: startDate && endDate ? `${startDate} - ${endDate}` : '',
    };
  }, [data, campaigns, adSets]);

  const topCampaignChartData = campaigns.slice(0, 10).map(campaign => ({
    name: campaign.campaignName.substring(0, 30) + (campaign.campaignName.length > 30 ? '...' : ''),
    spend: campaign.totalSpend,
    roas: campaign.avgRoas,
    ctr: campaign.avgCtr,
  }));

  const platformData = useMemo(() => {
    const platformStats = data.reduce((acc, ad) => {
      if (!acc[ad.platform]) {
        acc[ad.platform] = { platform: ad.platform, spend: 0, results: 0 };
      }
      acc[ad.platform].spend += ad.amountSpent;
      acc[ad.platform].results += ad.results;
      return acc;
    }, {} as Record<string, { platform: string; spend: number; results: number }>);

    return Object.values(platformStats);
  }, [data]);

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
                onClick={() => {
                  setSelectedAdSet(null);
                  setActiveTab('adsets');
                }}
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
            { key: 'campaigns', label: 'Campaigns' },
            { key: 'adsets', label: 'Ad Sets' },
            { key: 'ads', label: 'Ads' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'campaigns' | 'adsets' | 'ads')}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Sets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign, index) => (
                  <tr 
                    key={`${campaign.campaignId}-${index}`} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                    onClick={() => handleCampaignClick(campaign.campaignId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{campaign.campaignName}</div>
                      <div className="text-sm text-gray-500">ID: {campaign.campaignId}</div>
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
                      {formatCurrency(campaign.costPerResult)}
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
                  {!selectedCampaign && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ads</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdSets.slice(0, 50).map((adSet, index) => (
                  <tr 
                    key={`${adSet.adSetId}-${index}`} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                    onClick={() => handleAdSetClick(adSet.adSetId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-800">{adSet.adSetName}</div>
                      <div className="text-sm text-gray-500">ID: {adSet.adSetId}</div>
                    </td>
                    {!selectedCampaign && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {adSet.campaignName}
                      </td>
                    )}
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad</th>
                  {!selectedCampaign && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                  )}
                  {!selectedAdSet && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Set</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedAds
                  .sort((a, b) => b.amountSpent - a.amountSpent)
                  .slice(0, selectedCampaign || selectedAdSet ? 500 : 100)
                  .map((ad, index) => (
                  <tr key={`${ad.adId}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ad.adName}</div>
                      <div className="text-sm text-gray-500">ID: {ad.adId}</div>
                    </td>
                    {!selectedCampaign && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.campaignName}
                      </td>
                    )}
                    {!selectedAdSet && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ad.adSetName}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {ad.platforms.map((platform: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {ad.placements.map((placement: string, i: number) => (
                          <div key={i} className="text-xs text-gray-600">{placement}</div>
                        ))}
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