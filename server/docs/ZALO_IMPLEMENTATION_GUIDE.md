# Implementation Complete: Zalo Image Delivery Notifications

All code scaffolding is complete. Here's what was created and the next steps to deploy.

## ✅ Completed Deliverables

### 1. Core Services Created
- **`server/src/modules/notifications/zalo.service.ts`** (290 lines)
  - Zalo OA API client with token management
  - `sendImageMessage()` — sends images to customers
  - `sendDeliveryImagesImmediate()` — immediate send for new assignments
  - Retry logic and error handling
  - Fire-and-forget pattern for non-blocking sends

- **`server/src/modules/notifications/daily-send.service.ts`** (220 lines)
  - Queries deliveries with images from a target date
  - Phone fallback: `receiver_phone` → `customer.phone` → skip
  - Batch send with logging to `notification_logs` table
  - Idempotent (won't resend marked deliveries)

### 2. CLI & Automation
- **`server/scripts/dailySendDeliveryImages.ts`** (60 lines)
  - CLI wrapper for scheduling
  - Supports `--date YYYY-MM-DD` argument
  - Exit codes for cron integration (0 = success, 1 = failure)
  - Ready for external cron or cloud scheduler

### 3. Database
- **`server/database/migrations/20260508_add_notification_logs.sql`** (80 lines)
  - Creates `notification_logs` table (audit log for all sends)
  - Adds `notification_sent` and `notification_sent_at` to `delivery_orders`
  - Includes RLS policies for admin access
  - Indexed for performance

### 4. Integration Points
- **Modified `server/src/modules/delivery/delivery.service.ts`**
  - Added imports: `zaloService`, `normalizePhoneForAuth`, `logger`
  - After `assignVehicles()` saves assignments, async Zalo send is triggered
  - Fire-and-forget: non-blocking for user experience
  - Errors logged but don't block order processing

### 5. Documentation
- **`server/docs/ZALO_SETUP.md`** (350+ lines)
  - Complete setup guide for Zalo OA registration
  - Env variable configuration
  - Architecture overview
  - Testing instructions (local, production)
  - Monitoring & debugging
  - Future enhancements

## 🔧 Next Steps (to deploy)

### Step 1: Zalo OA Registration & Credentials
1. Register Zalo OA at [https://oa.zalo.me/](https://oa.zalo.me/)
2. Complete business verification
3. Get App ID, App Secret, and initial Access Token
4. Store in `.env`:
   ```env
   ZALO_APP_ID=your_app_id
   ZALO_APP_SECRET=your_app_secret
   ZALO_ACCESS_TOKEN=initial_token
   ZALO_ENABLE_SENDS=true
   ```

### Step 2: Run Database Migration
```bash
# Using Supabase CLI
supabase db push server/database/migrations/20260508_add_notification_logs.sql

# OR manually run SQL in Supabase dashboard
# Copy contents of the .sql file and execute
```

**Verify:**
```sql
-- Check tables exist
SELECT * FROM information_schema.tables 
WHERE table_name IN ('notification_logs', 'delivery_orders')
  AND table_schema = 'public';

-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'delivery_orders' 
AND column_name IN ('notification_sent', 'notification_sent_at');
```

### Step 3: Install Dependencies (if needed)
Check if `axios` is already in `server/package.json`:
```bash
cd server
npm ls axios
# If not present:
npm install axios
```

### Step 4: Update Environment Configuration
Add to production `.env` or secret management system:
```env
# Zalo OA
ZALO_APP_ID=your_prod_app_id
ZALO_APP_SECRET=your_prod_app_secret
ZALO_ACCESS_TOKEN=your_prod_token
ZALO_ENABLE_SENDS=true

# Optional: enable in-app cron (if NOT using external cron)
ENABLE_IN_APP_CRON=false  # Set to true only for single-worker deployments
```

### Step 5: Deploy Immediate Sends
The immediate send is already hooked into `assignVehicles()`. Just deploy the updated `server/src/modules/delivery/delivery.service.ts`:
```bash
# No additional deployment needed if using CI/CD
# Deploy as part of normal release cycle
```

**Test immediately:**
1. In UI, assign a vehicle to a delivery with images
2. Check server logs for `[ZaloService] Immediate send successful...` or error messages
3. If customer has interacted with OA, they should receive the message on Zalo

### Step 6: Configure Daily Send (choose one)

**Option A: External Cron (Recommended for Production)**

**Linux crontab:**
```bash
# SSH into server and edit crontab
crontab -e

# Add this line (runs daily at 8:00 AM Vietnam time)
0 8 * * * cd /path/to/app && NODE_ENV=production node server/scripts/dailySendDeliveryImages.ts >> /var/log/zalo-send.log 2>&1

# Verify:
crontab -l
```

**Google Cloud Scheduler:**
1. Go to Cloud Scheduler (if deployed on GCP)
2. Create new job:
   - Name: `daily-zalo-send`
   - Frequency: `0 8 * * *`
   - Timezone: `Asia/Ho_Chi_Minh`
   - Execution type: HTTP
   - URL: `https://your-api.com/api/admin/trigger-daily-send`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_ADMIN_TOKEN`
   - Body: `{ "date": "" }`

**Option B: In-App Cron (Single-worker deployments only)**

Update `server/src/app.ts` (if you want to enable this):
```typescript
import cron from 'node-cron';
import { dailySendService } from './modules/notifications/daily-send.service';

// Near the end of app initialization:
if (process.env.ENABLE_IN_APP_CRON === 'true' && process.env.NODE_ENV === 'production') {
  logger.info('[App] Starting in-app daily send scheduler');
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Cron] Running daily send at 8 AM');
    try {
      const result = await dailySendService.runDailySend();
      logger.info('[Cron] Daily send result:', result);
    } catch (err) {
      logger.error('[Cron] Daily send failed:', err);
    }
  });
}
```

Then install `node-cron`:
```bash
npm install node-cron
```

Set env var:
```env
ENABLE_IN_APP_CRON=true  # Only if single-worker; for scaled deployments, use external cron
```

### Step 7: Token Refresh Job (Important!)

Zalo access tokens expire after ~1 hour. Add a refresh cron job.

**Add to crontab:**
```bash
# Refresh token every 45 minutes
*/45 * * * * curl -X POST https://your-api.com/api/admin/refresh-zalo-token
```

**Or create an endpoint in your API:**
```typescript
// In server/src/modules/notifications/notifications.routes.ts
app.post('/api/admin/refresh-zalo-token', async (req, res) => {
  const success = await zaloService.refreshAccessToken();
  res.json({ success });
});
```

### Step 8: Verify Setup

**Local testing (development):**
```bash
# Set test env vars
export ZALO_APP_ID=test
export ZALO_APP_SECRET=test
export ZALO_ACCESS_TOKEN=test
export ZALO_ENABLE_SENDS=false  # Don't send real messages

# Run daily send for test date
node server/scripts/dailySendDeliveryImages.ts --date 2026-05-08

# Should output: "Daily send completed: total=X, sent=Y, failed=Z, skipped=W"
```

**Production smoke test:**
1. Assign a vehicle to a delivery with 1-2 images
2. Verify in logs: `[ZaloService] Immediate send successful...`
3. Run daily send manually:
   ```bash
   NODE_ENV=production node server/scripts/dailySendDeliveryImages.ts --date $(date +%Y-%m-%d)
   ```
4. Check database:
   ```sql
   SELECT * FROM notification_logs 
   WHERE provider = 'zalo_oa' 
   ORDER BY sent_at DESC LIMIT 5;
   ```

## 📊 Monitoring

### Logs to Watch
```bash
# Monitor real-time Zalo sends
tail -f /var/log/zalo-send.log | grep ZaloService

# Check for failures
grep 'failed\|error\|Error' /var/log/zalo-send.log | tail -20
```

### Database Queries
```sql
-- Daily send summary
SELECT 
  DATE(sent_at) as day,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notification_logs
WHERE provider = 'zalo_oa'
GROUP BY day ORDER BY day DESC;

-- Failed sends (for manual retry)
SELECT * FROM notification_logs 
WHERE provider = 'zalo_oa' AND status = 'failed'
ORDER BY sent_at DESC LIMIT 20;

-- Unnotified deliveries (if needed for retry)
SELECT d.id, d.product_name, d.image_urls
FROM delivery_orders d
WHERE d.notification_sent = FALSE 
  AND d.image_urls IS NOT NULL 
  AND array_length(d.image_urls, 1) > 0
ORDER BY d.created_at DESC;
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No recipient phone found" | Check `import_orders.receiver_phone` and `customers.phone` are populated; add fallback phone if needed |
| "Zalo access token expired" | Call `refreshAccessToken()` manually or ensure refresh cron is running |
| Sends not appearing in Zalo | Customer must have messaged OA first; check `notification_logs` for actual error |
| Cron not running | Verify crontab: `crontab -l`; check logs for errors; ensure file permissions on script |
| "ZALO_ENABLE_SENDS not configured" | Check `.env` has `ZALO_ENABLE_SENDS=true` |

## 📝 Key Files Reference

| File | Purpose |
|------|---------|
| `server/src/modules/notifications/zalo.service.ts` | Zalo API client |
| `server/src/modules/notifications/daily-send.service.ts` | Daily aggregation & send |
| `server/scripts/dailySendDeliveryImages.ts` | CLI for cron |
| `server/database/migrations/20260508_add_notification_logs.sql` | DB schema |
| `server/src/modules/delivery/delivery.service.ts` | Integration point (modified) |
| `server/docs/ZALO_SETUP.md` | Full setup guide |

## 🎯 Success Criteria

- [ ] Zalo OA registered and verified
- [ ] Env vars configured (ZALO_APP_ID, ZALO_APP_SECRET, ZALO_ACCESS_TOKEN)
- [ ] DB migration applied (notification_logs table exists)
- [ ] User assigns vehicle with images → customer receives Zalo message within 5 minutes
- [ ] Daily send cron runs successfully at 8 AM
- [ ] At least 1 entry in `notification_logs` with status='sent'
- [ ] No errors in server logs for Zalo sends
- [ ] Manual retry works (re-run CLI script for a past date)

---

**Questions or issues?** Check [server/docs/ZALO_SETUP.md](server/docs/ZALO_SETUP.md) for detailed guidance.
