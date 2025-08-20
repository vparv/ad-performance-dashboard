# Meta Ad Manager Performance Dashboard - Project Plan

## Project Overview
Build a comprehensive dashboard to analyze Meta Ad Manager campaign performance data with visual insights at campaign, ad set, and ad levels.

## Phase 1: Data Export Strategy

### Essential Data to Export from Meta Ad Manager

#### Campaign Level Metrics
- **Basic Info**: Campaign ID, Name, Objective, Status, Start/End Date
- **Performance**: Impressions, Clicks, CTR, CPC, CPM, Spend, ROAS
- **Audience**: Reach, Frequency
- **Conversions**: Purchases, Add to Cart, Leads, etc.

#### Ad Set Level Metrics  
- **Basic Info**: Ad Set ID, Name, Campaign ID, Status, Budget Type, Budget Amount
- **Targeting**: Age, Gender, Location, Interests, Behaviors
- **Performance**: Same metrics as campaign level
- **Delivery**: Bid Strategy, Optimization Goal

#### Ad Level Metrics
- **Basic Info**: Ad ID, Name, Ad Set ID, Creative Type, Format
- **Creative**: Headlines, Descriptions, CTA, Media URLs
- **Performance**: Same core metrics
- **Quality**: Relevance Score, Quality Ranking

### Export Methods

#### Option 1: Manual CSV Export (Phase 1 - Quick Start)
**Pros**: 
- Immediate implementation
- No API setup required
- Full control over date ranges

**Cons**: 
- Manual process
- Limited automation
- Potential for human error

**Export Steps**:
1. Navigate to Ads Manager → Reports
2. Create custom report with required metrics
3. Set date range (recommended: last 30 days for initial testing)
4. Export as CSV
5. Include all three levels (Campaign, Ad Set, Ad)

#### Option 2: Meta Marketing API (Phase 2 - Automation)
**Pros**: 
- Automated data retrieval
- Real-time updates
- Programmatic control

**Cons**: 
- Requires API setup and approval
- Rate limiting considerations
- More complex implementation

## Phase 2: Data Ingestion Architecture

### File Structure Strategy
```
/data
  /exports
    - campaigns_2024-01-15.csv
    - adsets_2024-01-15.csv  
    - ads_2024-01-15.csv
  /processed
    - merged_data_2024-01-15.json
```

### Data Processing Pipeline
1. **File Upload**: Drag-and-drop CSV upload interface
2. **Validation**: Check required columns and data types
3. **Normalization**: Standardize date formats, currency, percentages
4. **Relationship Mapping**: Link Ads → Ad Sets → Campaigns
5. **Storage**: In-memory processing initially, SQLite for persistence

### Required CSV Columns Mapping

#### Campaigns CSV
```typescript
interface CampaignData {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  status: string;
  start_date: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  roas?: number;
  reach: number;
  frequency: number;
}
```

#### Ad Sets CSV  
```typescript
interface AdSetData {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  status: string;
  budget_type: string;
  budget_amount: number;
  target_age_min: number;
  target_age_max: number;
  target_gender: string;
  target_locations: string;
  bid_strategy: string;
  optimization_goal: string;
  // + same performance metrics as campaigns
}
```

#### Ads CSV
```typescript
interface AdData {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  creative_type: string;
  format: string;
  headline: string;
  description: string;
  cta: string;
  media_url?: string;
  relevance_score?: number;
  quality_ranking?: string;
  // + same performance metrics as campaigns
}
```

## Phase 3: Dashboard Visualization Strategy

### Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│                Header & Filters                 │
├─────────────┬───────────────┬───────────────────┤
│   Summary   │   Top Metrics │   Date Range      │
│   Cards     │   Charts      │   Picker          │
├─────────────┴───────────────┴───────────────────┤
│               Campaign Performance              │
│               (Table + Charts)                  │
├─────────────────────────────────────────────────┤
│   Ad Set Analysis    │    Ad Creative Analysis  │
│   (Drilling Down)    │    (Creative Performance)│
└─────────────────────────────────────────────────┘
```

### Key Visualizations

#### Summary Dashboard
- **KPI Cards**: Total Spend, Total ROAS, Best Performing Campaign, Worst CTR
- **Trend Lines**: Spend vs ROAS over time, CTR trends, CPC trends
- **Performance Distribution**: Spend by campaign (pie chart), CTR by ad set (bar chart)

#### Campaign Analysis
- **Data Table**: Sortable, filterable campaign list with key metrics
- **Performance Matrix**: Spend vs ROAS scatter plot
- **Time Series**: Daily performance trends for selected campaigns

#### Ad Set Deep Dive
- **Targeting Analysis**: Performance by age group, gender, location
- **Budget Utilization**: Actual spend vs budget allocation
- **Optimization Goal Performance**: Conversion rates by optimization type

#### Creative Performance
- **Format Analysis**: Performance by ad format (video, image, carousel)
- **Copy Performance**: CTR by headline length, CTA type
- **Quality Metrics**: Relevance score distribution

### Technology Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Charts**: Recharts or Chart.js for visualizations
- **Data Processing**: Papa Parse for CSV parsing
- **State Management**: React Context or Zustand
- **Storage**: Local Storage → SQLite → PostgreSQL (future)

## Implementation Roadmap

### Week 1: Foundation
- [ ] File upload component with CSV validation
- [ ] Basic data parsing and type definitions
- [ ] Simple campaign list view

### Week 2: Core Analytics  
- [ ] KPI summary cards
- [ ] Campaign performance table with sorting/filtering
- [ ] Basic charts (spend trends, CTR distribution)

### Week 3: Advanced Features
- [ ] Ad set and ad level drilling
- [ ] Interactive filtering and date range selection  
- [ ] Export functionality for processed insights

### Week 4: Polish & Optimization
- [ ] Performance optimizations for large datasets
- [ ] Error handling and validation improvements
- [ ] UI/UX refinements

## Data Export Checklist for Meta Ad Manager

### Initial Export Requirements
1. **Date Range**: Last 30 days (adjust as needed)
2. **Breakdown**: By Campaign, Ad Set, and Ad
3. **Required Metrics**:
   - Impressions, Clicks, CTR, CPC, CPM
   - Spend, ROAS (if e-commerce)
   - Reach, Frequency
   - Relevance Score (for ads)

### Export Process
1. Go to Meta Ads Manager
2. Navigate to Reports section
3. Create Custom Report
4. Select metrics and breakdowns
5. Export as CSV for each level
6. Save files with consistent naming convention

## Success Metrics
- **Data Accuracy**: 100% data import success rate
- **Performance**: Dashboard loads < 2 seconds with 1000+ campaigns
- **Usability**: Identify top/bottom performers within 3 clicks
- **Insights**: Surface 3+ actionable optimization opportunities

## Future Enhancements
- Real-time API integration
- Automated report scheduling
- Competitive analysis features
- A/B testing recommendations
- Budget optimization suggestions