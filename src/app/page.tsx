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
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Upload New Data
              </button>
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
