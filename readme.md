# LineOA Notify - XAU Price Alerts

## TODO: 10% Price Change Notification

### Current Implementation
- ✅ Supabase Edge Function (Deno runtime)
- ✅ XAU/USD price fetching from goldprice.org
- ✅ LINE messaging integration
- ✅ Returns `percentChange` in XauPrice interface

### Feature: Send Notification When XAU Price Changes Over 10%

#### 1. **Data Storage** (Supabase)
- [ ] Create table `xau_price_history` in Supabase
  - `id` (uuid, primary key)
  - `price` (numeric)
  - `percent_change` (numeric)
  - `close_price` (numeric)
  - `timestamp` (timestamptz)
  - `created_at` (timestamptz, default now())
- [ ] Create table `price_alerts` to track sent alerts
  - `id` (uuid, primary key)
  - `alert_type` (text) - e.g., 'price_spike_10pct'
  - `price_from` (numeric)
  - `price_to` (numeric)
  - `percent_change` (numeric)
  - `sent_at` (timestamptz, default now())
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create index on `xau_price_history(timestamp DESC)`

#### 2. **Database Client Setup** (Deno)
- [ ] Add Supabase client imports in `index.ts`
  ```typescript
  import { createClient } from 'jsr:@supabase/supabase-js@2'
  ```
- [ ] Initialize Supabase client using env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 3. **Price Comparison Logic** (TypeScript)
- [ ] Create `utils/price-analyzer.ts`:
  - [ ] Function `getLastRecordedPrice()` - fetch from `xau_price_history`
  - [ ] Function `calculatePriceChange(oldPrice, newPrice)` - calculate % change
  - [ ] Function `shouldSendAlert(percentChange)` - check if |change| >= 10%
  - [ ] Function `saveCurrentPrice(xauPrice)` - insert into history table
  - [ ] Function `recordAlert(alertData)` - insert into alerts table

#### 4. **Update Main Function** (`index.ts`)
- [ ] After fetching XAU price, get last recorded price from DB
- [ ] Calculate actual price change from last recorded price
- [ ] If change >= 10% (up or down):
  - [ ] Send special alert message with 🚨 emoji
  - [ ] Include: old price, new price, % change, trend direction
  - [ ] Set `notificationDisabled: false` for urgent alerts
  - [ ] Record alert in `price_alerts` table
- [ ] Always save current price to `xau_price_history`
- [ ] Return alert status in response

#### 5. **Enhanced LINE Message** (`line-message.ts`)
- [ ] Create `formatAlertMessage(oldPrice, newPrice, percentChange)`:
  - Use Flex Message for rich formatting
  - Include visual indicators (🔺 up, 🔻 down)
  - Add timestamp in Bangkok timezone
  - Highlight critical changes in red/green
- [ ] Keep simple text message as fallback

#### 6. **Environment Variables**
Required `.env` additions:
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - For bypassing RLS
- [ ] `LINE_CHANNEL_ACCESS_TOKEN` - Already configured ✅
- [ ] `LINE_RECIPIENT_ID` - Already configured ✅

#### 7. **Scheduled Execution** (Supabase Cron)
- [ ] Set up pg_cron or Supabase Edge Function cron trigger
- [ ] Run every 5-15 minutes (adjust based on needs)
- [ ] Configuration in `supabase/config.toml`:
  ```toml
  [functions.xau-price]
  verify_jwt = false
  ```

#### 8. **Error Handling**
- [ ] Handle DB connection failures gracefully
- [ ] Retry logic for API failures (goldprice.org)
- [ ] Fallback if LINE API is down
- [ ] Log all errors to Supabase logs

#### 9. **Testing**
- [ ] Unit tests for price calculation logic
- [ ] Test alert threshold detection
- [ ] Mock LINE API responses
- [ ] Test DB insert/query operations
- [ ] Manual test with simulated 10% change

#### 10. **Monitoring & Optimization**
- [ ] Add logging for price checks and alerts
- [ ] Track alert frequency to avoid spam
- [ ] Implement cooldown period (e.g., max 1 alert per hour for same direction)
- [ ] Monitor Edge Function execution time

---

## Tech Stack
- **Runtime**: Deno (Supabase Edge Functions)
- **Database**: Supabase PostgreSQL
- **Language**: TypeScript
- **Messaging**: LINE Messaging API
- **Data Source**: goldprice.org API
- **Deployment**: Supabase CLI

## Current Files
- `supabase/functions/xau-price/index.ts` - Main Edge Function
- `supabase/functions/xau-price/get-data.ts` - XAU price fetching
- `supabase/functions/xau-price/line-message.ts` - LINE messaging utilities
- `supabase/functions/xau-price/deno.json` - Deno configuration
