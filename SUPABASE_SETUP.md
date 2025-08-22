# Supabase Integration Setup

This guide will help you set up Supabase integration for your ads performance dashboard to avoid re-uploading old data every day.

## Benefits

✅ **No more daily re-uploads**: Only new data gets saved  
✅ **Automatic duplicate detection**: Same ad + date + placement combinations are automatically handled  
✅ **Persistent storage**: Access your historical data anytime  
✅ **Fast loading**: Load from database instead of CSV parsing  
✅ **Incremental updates**: Only upload new records, skip existing ones  

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and give it a name like "ads-performance-dashboard"
4. Set a strong database password
5. Choose a region close to you
6. Click "Create new project" (this takes ~2 minutes)

### 2. Set Up the Database Schema

1. In your Supabase dashboard, go to the "SQL Editor" tab
2. Copy the entire contents of `supabase-schema.sql` from this project
3. Paste it into a new query in the SQL Editor
4. Click "Run" to create all tables, indexes, and views

### 3. Get Your Supabase Credentials

1. Go to Settings → API in your Supabase dashboard
2. Find these two values:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

### 4. Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Test the Integration

1. Start your development server: `npm run dev`
2. Go to http://localhost:3000
3. You should see a "Load from Database" button in the header
4. Upload a CSV file with the "Save to Supabase database" checkbox checked

## How It Works

### Incremental Loading
- When you upload a CSV, the system checks which records already exist
- Only new combinations of (ad_id + date + placement + platform) are saved
- Existing records are skipped automatically

### Duplicate Prevention
The database has a unique constraint on:
- `ad_id` + `day` + `placement` + `platform`

This ensures no duplicate records even if you accidentally upload the same data twice.

### Data Loading Options

#### Option 1: Load from Database
- Click "Load from Database" to view all your historical data
- Fast loading from optimized database views
- No CSV parsing required

#### Option 2: Upload CSV with Database Save
- Check "Save to Supabase database" when uploading
- Data loads immediately for dashboard viewing
- New records automatically saved to database
- Existing records skipped with summary report

## Database Schema

The main table `v_ad_performance_data` stores:
- All Facebook/Meta ad performance metrics
- Campaign, Ad Set, and Ad information
- Daily performance breakdowns by placement and platform
- Automatic timestamps for data tracking

### Optimized Views
- `v_campaign_summary` - Pre-aggregated campaign performance
- `v_ad_set_summary` - Pre-aggregated ad set performance  
- `v_daily_summary` - Pre-aggregated daily totals

## CSV Data Requirements

Your CSV should include these columns (standard Facebook Ads Manager export):
- Campaign name, Campaign ID
- Ad set name, Ad set ID  
- Ad name, Ad ID
- Platform, Placement
- Day (YYYY-MM-DD format)
- Amount spent (USD), Results, ROAS, CTR, etc.

## Troubleshooting

### "Failed to save data" error
- Check your Supabase URL and API key in `.env.local`
- Verify the database schema was created successfully
- Check the browser console for detailed error messages

### "No data found in database"
- Upload at least one CSV file with "Save to Supabase database" checked first
- Verify data was saved by checking the "View DB Status" button

### Environment variables not loading
- Restart your development server after changing `.env.local`
- Make sure the file is in your project root directory
- Don't commit `.env.local` to version control

## Daily Workflow

1. **First time**: Upload your CSV with database save enabled
2. **Daily updates**: 
   - Export new data from Facebook Ads Manager
   - Upload CSV with database save enabled
   - Only new records get added, duplicates are skipped
3. **View historical data**: Use "Load from Database" anytime

## Security Notes

- The integration uses Supabase's Row Level Security (RLS)
- Current policy allows all operations (suitable for personal use)
- For production/team use, implement proper authentication and RLS policies
- Never commit your `.env.local` file to version control