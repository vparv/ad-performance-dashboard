export interface AdPerformanceData {
  // Campaign Info
  campaignName: string;
  campaignId: string;
  
  // Ad Set Info  
  adSetName: string;
  adSetId: string;
  
  // Ad Info
  adName: string;
  adId: string;
  
  // Targeting & Placement
  placement: string;
  platform: string;
  
  // Status & Delivery
  deliveryStatus: string;
  deliveryLevel: string;
  
  // Performance Metrics
  reach: number;
  impressions: number;
  frequency: number;
  results: number;
  amountSpent: number;
  costPerResult: number;
  purchaseRoas: number;
  ctrAll: number;
  resultRate: number;
  
  // Campaign Timing
  starts: string;
  ends: string;
  reportingStarts: string;
  reportingEnds: string;
  
  // Attribution
  attributionSetting: string;
  resultType: string;
}

export interface CampaignSummary {
  campaignName: string;
  campaignId: string;
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalReach: number;
  avgRoas: number;
  avgCtr: number;
  costPerResult: number;
  adCount: number;
  adSetCount: number;
  starts: string;
  ends: string;
}

export interface AdSetSummary {
  adSetName: string;
  adSetId: string;
  campaignName: string;
  campaignId: string;
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalReach: number;
  avgRoas: number;
  avgCtr: number;
  costPerResult: number;
  adCount: number;
}

// Helper type for CSV parsing
export type RawCSVRow = {
  [key: string]: string;
};

// CSV column mapping to our interface
export const CSV_COLUMN_MAPPING = {
  "Campaign name": "campaignName",
  "Ad set name": "adSetName", 
  "Campaign ID": "campaignId",
  "Placement": "placement",
  "Ad name": "adName",
  "Ad set ID": "adSetId",
  "Ad ID": "adId",
  "Platform": "platform",
  "Delivery status": "deliveryStatus",
  "Delivery level": "deliveryLevel",
  "Reach": "reach",
  "Impressions": "impressions",
  "Frequency": "frequency",
  "Attribution setting": "attributionSetting",
  "Result Type": "resultType",
  "Results": "results",
  "Amount spent (USD)": "amountSpent",
  "Cost per result": "costPerResult",
  "Starts": "starts",
  "Ends": "ends",
  "Purchase ROAS (return on ad spend)": "purchaseRoas",
  "CTR (all)": "ctrAll",
  "Result rate": "resultRate",
  "Reporting starts": "reportingStarts",
  "Reporting ends": "reportingEnds"
} as const;