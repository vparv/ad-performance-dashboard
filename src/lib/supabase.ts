import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Tables
export type Database = {
  public: {
    Tables: {
      v_ad_performance_data: {
        Row: AdPerformanceRow
        Insert: AdPerformanceInsert
        Update: AdPerformanceUpdate
      }
    }
  }
}

export interface AdPerformanceRow {
  id: string
  campaign_name: string
  campaign_id: string
  ad_set_name: string
  ad_set_id: string
  ad_name: string
  ad_id: string
  placement: string
  platform: string
  delivery_status: string
  delivery_level: string
  reach: number
  impressions: number
  frequency: number
  results: number
  amount_spent: number
  cost_per_result: number
  purchase_roas: number
  ctr_all: number
  result_rate: number
  starts: string
  ends: string
  reporting_starts: string
  reporting_ends: string
  day: string
  attribution_setting: string
  result_type: string
  created_at: string
  updated_at: string
}

export interface AdPerformanceInsert {
  campaign_name: string
  campaign_id: string
  ad_set_name: string
  ad_set_id: string
  ad_name: string
  ad_id: string
  placement: string
  platform: string
  delivery_status: string
  delivery_level: string
  reach: number
  impressions: number
  frequency: number
  results: number
  amount_spent: number
  cost_per_result: number
  purchase_roas: number
  ctr_all: number
  result_rate: number
  starts: string
  ends: string
  reporting_starts: string
  reporting_ends: string
  day: string
  attribution_setting: string
  result_type: string
}

export interface AdPerformanceUpdate {
  campaign_name?: string
  campaign_id?: string
  ad_set_name?: string
  ad_set_id?: string
  ad_name?: string
  ad_id?: string
  placement?: string
  platform?: string
  delivery_status?: string
  delivery_level?: string
  reach?: number
  impressions?: number
  frequency?: number
  results?: number
  amount_spent?: number
  cost_per_result?: number
  purchase_roas?: number
  ctr_all?: number
  result_rate?: number
  starts?: string
  ends?: string
  reporting_starts?: string
  reporting_ends?: string
  day?: string
  attribution_setting?: string
  result_type?: string
}