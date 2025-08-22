'use client';

import { useState, useCallback } from 'react';
import { AdPerformanceData } from '@/types/adData';
import { parseAdPerformanceCSV } from '@/utils/csvParser';
import { saveAdPerformanceData, getIncrementalData, getDatabaseSummary } from '@/utils/supabaseService';
import type { UploadResult } from '@/utils/supabaseService';

interface CSVUploadProps {
  onDataLoad: (data: AdPerformanceData[]) => void;
  onDatabaseLoad?: (dateFilters?: { startDate?: string; endDate?: string }) => void;
}

export default function CSVUpload({ onDataLoad, onDatabaseLoad }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dbSummary, setDbSummary] = useState<{
    totalRecords: number;
    dateRange: { start: string; end: string } | null;
    campaignCount: number;
    adSetCount: number;
    adCount: number;
  } | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [loadDateStart, setLoadDateStart] = useState<string>('');
  const [loadDateEnd, setLoadDateEnd] = useState<string>('');

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setUploadResult(null);

    try {
      const text = await file.text();
      const data = await parseAdPerformanceCSV(text);
      
      if (data.length === 0) {
        setError('No valid data found in CSV file');
        return;
      }

      // Load data to dashboard
      onDataLoad(data);

      // If user wants to save to database, do incremental save
      if (saveToDatabase) {
        console.log('🔄 Save to database enabled, processing', data.length, 'records');
        setIsSaving(true);
        try {
          // Get only new records that don't already exist
          console.log('🔍 Checking for incremental data...');
          console.log('📝 Sample CSV data:', data[0]);
          const incrementalData = await getIncrementalData(data);
          console.log('📊 Incremental data:', incrementalData.length, 'new records');
          
          if (incrementalData.length === 0) {
            setSuccess('All data already exists in database. No new records to save.');
            setUploadResult({
              success: true,
              inserted: 0,
              updated: 0,
              errors: [],
              message: 'No new data to save'
            });
          } else {
            // Save only new data
            const result = await saveAdPerformanceData(incrementalData);
            setUploadResult(result);
            
            if (result.success) {
              setSuccess(`Successfully saved ${result.inserted} new records to database!`);
            } else {
              setError(`Failed to save data: ${result.errors.join(', ')}`);
            }
          }
        } catch (saveError) {
          setError(`Failed to save to database: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
        } finally {
          setIsSaving(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoad, saveToDatabase]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Parsing CSV data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📊</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Meta Ad Performance CSV
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              
              {/* Database Integration Options */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="save-to-db"
                    checked={saveToDatabase}
                    onChange={(e) => setSaveToDatabase(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="save-to-db" className="text-sm font-medium text-gray-700">
                    Save to Supabase database (avoids re-uploading existing data)
                  </label>
                </div>
                
                {saveToDatabase && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    💡 Only new records will be saved. Duplicates are automatically detected and skipped.
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
              />
              <div className="flex space-x-3">
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Choose File'
                  )}
                </label>
                
                {saveToDatabase && (
                  <button
                    onClick={async () => {
                      setIsLoadingFromDB(true);
                      try {
                        const summary = await getDatabaseSummary();
                        setDbSummary(summary);
                      } catch {
                        setError('Failed to load database summary');
                      } finally {
                        setIsLoadingFromDB(false);
                      }
                    }}
                    disabled={isLoadingFromDB}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    {isLoadingFromDB ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'View DB Status'
                    )}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Supports CSV files exported from Meta Ad Manager
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="text-red-500">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="text-green-500">✅</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Upload Summary</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>📊 Records processed: {uploadResult.inserted + uploadResult.updated}</p>
            <p>➕ New records: {uploadResult.inserted}</p>
            <p>🔄 Updated records: {uploadResult.updated}</p>
            {uploadResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-red-700">Errors:</p>
                <ul className="list-disc list-inside text-red-600">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {dbSummary && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="text-sm font-medium text-purple-800 mb-2">Database Summary</h3>
          <div className="text-sm text-purple-700 grid grid-cols-2 gap-2">
            <p>📊 Total Records: {dbSummary.totalRecords.toLocaleString()}</p>
            <p>🏢 Campaigns: {dbSummary.campaignCount}</p>
            <p>📁 Ad Sets: {dbSummary.adSetCount}</p>
            <p>📝 Ads: {dbSummary.adCount}</p>
            {dbSummary.dateRange && (
              <p className="col-span-2">📅 Date Range: {dbSummary.dateRange.start} to {dbSummary.dateRange.end}</p>
            )}
          </div>
          
          {onDatabaseLoad && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-600">Load Range:</label>
                <input
                  type="date"
                  value={loadDateStart}
                  onChange={(e) => setLoadDateStart(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Start date"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={loadDateEnd}
                  onChange={(e) => setLoadDateEnd(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="End date"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const dateFilters = loadDateStart || loadDateEnd 
                      ? { startDate: loadDateStart || undefined, endDate: loadDateEnd || undefined }
                      : undefined;
                    onDatabaseLoad(dateFilters);
                    setDbSummary(null);
                  }}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  Load from Database
                </button>
                
                <button
                  onClick={() => {
                    setLoadDateStart('');
                    setLoadDateEnd('');
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Clear Dates
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                💡 Leave dates empty to load last 14 days by default
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}