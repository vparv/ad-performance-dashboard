'use client';

import { useState } from 'react';
import CSVUpload from '@/components/CSVUpload';
import Dashboard from '@/components/Dashboard';
import { AdPerformanceData } from '@/types/adData';

export default function Home() {
  const [adData, setAdData] = useState<AdPerformanceData[] | null>(null);

  const handleDataLoad = (data: AdPerformanceData[]) => {
    setAdData(data);
  };

  const handleReset = () => {
    setAdData(null);
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
            {adData && (
              <div className="flex items-center space-x-4">
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
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!adData ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <CSVUpload onDataLoad={handleDataLoad} />
          </div>
        ) : (
          <Dashboard data={adData} />
        )}
      </main>
    </div>
  );
}
