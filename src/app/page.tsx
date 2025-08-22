'use client';

import { useState } from 'react';
import CSVUpload from '@/components/CSVUpload';
import Dashboard from '@/components/Dashboard';
import { AdPerformanceData } from '@/types/adData';
import { getAdPerformanceData } from '@/utils/supabaseService';

export default function Home() {
  const [adData, setAdData] = useState<AdPerformanceData[] | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDataLoad = (data: AdPerformanceData[]) => {
    setAdData(data);
    setError(null);
  };

  const handleDatabaseLoad = async (dateFilters?: { startDate?: string; endDate?: string }) => {
    setIsLoadingFromDB(true);
    setError(null);
    try {
      // Default to last 14 days if no date filters provided
      let startDate = dateFilters?.startDate;
      let endDate = dateFilters?.endDate;
      
      if (!startDate && !endDate) {
        const today = new Date();
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(today.getDate() - 14);
        
        startDate = fourteenDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
        endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        console.log(`📅 Loading last 14 days: ${startDate} to ${endDate}`);
        console.log('🔍 Debug - today:', today, 'fourteenDaysAgo:', fourteenDaysAgo);
      } else {
        console.log(`📅 Loading custom range: ${startDate} to ${endDate}`);
      }
      
      // Load data from database with date range
      const dbData = await getAdPerformanceData({
        startDate,
        endDate
        // Removed limit to get all data in date range
      });
      
      if (dbData.length === 0) {
        setError('No data found in database. Upload some CSV data first.');
      } else {
        // Debug: Check what dates are actually in the data
        const dates = [...new Set(dbData.map(row => row.day))].sort();
        console.log('📅 Actual dates in loaded data:', dates.slice(0, 10), '...', dates.slice(-3));
        console.log('🔢 Date range:', dates[0], 'to', dates[dates.length - 1]);
        
        setAdData(dbData);
      }
    } catch (err) {
      setError(`Failed to load from database: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingFromDB(false);
    }
  };

  const handleReset = () => {
    setAdData(null);
    setError(null);
  };

  const handleDateRangeChange = async (startDate?: string, endDate?: string) => {
    console.log('🔄 Date range changed, re-fetching data:', startDate, 'to', endDate);
    await handleDatabaseLoad({ startDate, endDate });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Meta Ads Performance Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Analyze your campaign, ad set, and ad performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {adData ? (
                <>
                  <a
                    href="https://adsmanager.facebook.com/adsmanager/reporting/view?act=604804066640450&ads_manager_write_regions=true&business_id=1084628270319068&breakdowns=campaign_name%2Cadset_name%2Ccampaign_id%2Cad_name%2Cadset_id%2Cad_id%2Cpublisher_platform%2Cplatform_position%2Cdays_1&locked_dimensions=0&selected_report_id=120229592933450727&sort_spec=days_1~desc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Export New Data
                  </a>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Upload New Data
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleDatabaseLoad()}
                  disabled={isLoadingFromDB}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors flex items-center"
                >
                  {isLoadingFromDB ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      📊 Load from Database
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="text-red-500">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {!adData ? (
          <div className="space-y-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <CSVUpload onDataLoad={handleDataLoad} onDatabaseLoad={handleDatabaseLoad} />
            </div>
          </div>
        ) : (
          <Dashboard data={adData} onDateRangeChange={handleDateRangeChange} />
        )}
      </main>
    </div>
  );
}
