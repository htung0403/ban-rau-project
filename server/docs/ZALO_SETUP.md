# Zalo OA Image Delivery Notifications

This module sends delivery images to customers via Zalo Official Account (OA) in two modes:
1. **Immediate**: triggered when vehicle assignments are saved (fires async, non-blocking)
2. **Daily**: aggregates and sends images from all deliveries created on a specific date

## Setup & Prerequisites

### 1. Zalo Official Account (OA) Registration

1. Go to [https://oa.zalo.me/](https://oa.zalo.me/) and register for a Zalo OA.
2. Complete business verification (may take a few days).
3. Once verified, go to **Developer** → **API Keys** and note your:
   - `App ID` (OA ID)
   - `App Secret`
4. In **Settings** → **API Permissions**, enable:
   - Send Message (Gửi tin nhắn)
   - Get User Info (Lấy thông tin người dùng)

### 2. Get Access Token

Zalo uses OAuth 2.0. Initial token is obtained via `client_credentials` grant:

```bash
curl -X POST https://oauth.zaloapis.vn/v4/oa/access_token \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "app_secret": "YOUR_APP_SECRET",
    "grant_type": "client_credentials"
  }'
```

Response:
```json
{
  "access_token": "access_token_string",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Save the `access_token` value.

### 3. Environment Variables

Add to `.env` (or deployment secrets):

```env
# Zalo OA Configuration
ZALO_APP_ID=1234567890        # Your OA App ID
ZALO_APP_SECRET=your_secret   # Your OA App Secret
ZALO_ACCESS_TOKEN=your_token  # Initial access token (will be refreshed in code)
ZALO_ENABLE_SENDS=true        # Enable/disable sends (useful for testing)
```

## Architecture

### Service Files

#### `server/src/modules/notifications/zalo.service.ts`
Encapsulates Zalo API communication:
- `sendImageMessage(options)` — sends images to a single recipient
- `refreshAccessToken()` — refreshes OAuth token (call every ~45 min)
- Handles retries, rate limits, and error logging

#### `server/src/modules/notifications/daily-send.service.ts`
Daily aggregation and sending:
- `runDailySend(targetDate?)` — queries deliveries from a date with images, builds recipients, sends
- Recipient fallback: `import_orders.receiver_phone` → `customers.phone` → skip
- Logs all sends to `notification_logs` table for audit and retry

### CLI Script

#### `server/scripts/dailySendDeliveryImages.ts`
Wrapper for running daily sends via cron:
```bash
# Run for today
node server/scripts/dailySendDeliveryImages.ts

# Run for specific date
node server/scripts/dailySendDeliveryImages.ts --date 2026-05-07
```

Exit codes:
- `0` — success (at least some sent or skipped)
- `1` — all failed or fatal error

### Database

#### `notification_logs` table
Tracks all notification attempts (audit log):
- `delivery_id` — reference to delivery
- `provider` — `'zalo_oa'`, `'sms'`, `'email'` (extensible)
- `status` — `'sent'`, `'failed'`, `'skipped'`
- `recipient_phone` — destination
- `message_id` — provider-specific ID
- `error_message` — reason if failed
- `sent_at` — timestamp

#### `delivery_orders` additions
- `notification_sent` (BOOLEAN) — has a notification been sent
- `notification_sent_at` (TIMESTAMP) — when it was sent

## Integration Points

### Immediate Send (after assignment)

In `server/src/modules/delivery/delivery.service.ts`, after `delivery_vehicles` insert and payment collections creation:

```typescript
// Example: trigger sends asynchronously after assignments saved
if (finalAssignmentsToSubmit.length > 0 && assignmentImages.length > 0) {
  // Fire-and-forget async send (do NOT await)
  zaloService.sendDeliveryNotifications(order.id, finalAssignmentsToSubmit)
    .catch((err) => {
      logger.error('[assignVehicles] Async Zalo send failed:', err);
      // Log to notification_logs so manual retry is possible
    });
}
```

### Daily Send (cron)

**Option A: External Cron (Recommended)**

Linux crontab:
```bash
# Run daily at 8:00 AM
0 8 * * * cd /path/to/app && node server/scripts/dailySendDeliveryImages.ts >> /var/log/zalo-send.log 2>&1
```

Google Cloud Scheduler:
1. Create a new Cloud Scheduler job
2. Set frequency: `0 8 * * *` (8 AM daily)
3. Set HTTP target: `POST https://your-app.com/api/admin/trigger-daily-send`
4. Add header: `Authorization: Bearer YOUR_ADMIN_TOKEN`
5. Body: `{ "date": "" }` (empty uses today)

**Option B: In-App Scheduler (Optional)**

Add to `server/src/app.ts`:

```typescript
import cron from 'node-cron';

// Initialize in-app daily send cron (only if ENABLE_IN_APP_CRON=true and single worker)
if (process.env.ENABLE_IN_APP_CRON === 'true' && process.env.NODE_ENV === 'production') {
  logger.info('[App] Starting in-app daily send scheduler');
  cron.schedule('0 8 * * *', async () => {
    logger.info('[Cron] Running daily send');
    try {
      const result = await dailySendService.runDailySend();
      logger.info('[Cron] Daily send complete:', result);
    } catch (err) {
      logger.error('[Cron] Daily send failed:', err);
    }
  });
}
```

## Key Constraints & Limitations

### Zalo OA Messaging Constraints

1. **Recipient Interaction Required**
   - Recipients must have messaged the OA or followed it to receive messages.
   - Cold messaging to uninteracted users will fail silently (no error, but message not received).
   - **Solution**: Store `zalo_user_id` or `zalo_opt_in` when customer first interacts with OA; filter recipients based on this flag.

2. **Token Expiration**
   - Access tokens expire after ~1 hour.
   - The `ZaloService` implements `refreshAccessToken()` for periodic refresh.
   - **Best practice**: Call `zaloService.refreshAccessToken()` every 45 minutes (in a separate cron job or on app startup).

3. **Rate Limits**
   - Zalo OA API has rate limits per account (typically ~100 requests/min).
   - If exceeded, the service retries with exponential backoff.
   - **For bulk sends**: space out requests or batch them over multiple minutes.

4. **Image Handling**
   - Images must be public URLs (Zalo downloads them).
   - Cloudinary URLs are supported.
   - Image delivery is not guaranteed if URLs are inaccessible.

### Phone Fallback Strategy

The service uses this priority for finding recipient phones:
1. `import_orders.receiver_phone`
2. `vegetable_orders.receiver_phone`
3. `import_orders.customers.phone`
4. `vegetable_orders.customers.phone`
5. Skip if none found

**Always normalize phones** before sending:
```typescript
import { normalizePhoneForAuth } from '../../utils/phoneAuth';
const normalized = normalizePhoneForAuth(rawPhone);
```

## Testing

### Local Testing (Development)

1. Set test credentials in `.env`:
   ```env
   ZALO_APP_ID=test_app_id
   ZALO_APP_SECRET=test_secret
   ZALO_ACCESS_TOKEN=test_token
   ZALO_ENABLE_SENDS=false  # Disable real sends
   ```

2. Mock the HTTP calls in tests:
   ```typescript
   import axios from 'axios';
   jest.mock('axios');
   
   const mockPost = axios.post as jest.Mock;
   mockPost.mockResolvedValue({
     data: { message_id: 'msg_123' }
   });
   ```

3. Run the CLI with test data:
   ```bash
   # Dry run (no real sends)
   NODE_ENV=test node server/scripts/dailySendDeliveryImages.ts --date 2026-05-08
   ```

### Production Deployment Checklist

- [ ] Zalo OA registered and verified
- [ ] App ID, App Secret, and initial Access Token obtained
- [ ] `.env` or secrets configured with credentials
- [ ] `notification_logs` table migrated (run migration SQL)
- [ ] `delivery_orders` columns added (`notification_sent`, `notification_sent_at`)
- [ ] External cron or in-app scheduler configured
- [ ] Token refresh cron job added (every 45 min)
- [ ] Logging configured (CloudWatch, Sentry, or local logs)
- [ ] Failure alerts set up (e.g., Slack notification if daily send fails)
- [ ] Manual retry process documented for failed sends

## Monitoring & Debugging

### View Logs

```sql
-- Recent failed sends
SELECT * FROM notification_logs 
WHERE status = 'failed' 
ORDER BY sent_at DESC 
LIMIT 20;

-- Sends by day
SELECT 
  DATE(sent_at) as day,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notification_logs
WHERE provider = 'zalo_oa'
GROUP BY day
ORDER BY day DESC;
```

### Manual Retry

If sends fail, check `notification_logs` table and manually retry:

```sql
-- Find failed deliveries from a date
SELECT DISTINCT d.id, d.product_name, nl.error_message
FROM notification_logs nl
JOIN delivery_orders d ON d.id = nl.delivery_id
WHERE nl.provider = 'zalo_oa'
  AND nl.status = 'failed'
  AND DATE(nl.sent_at) = '2026-05-08'
ORDER BY nl.sent_at DESC;

-- Rerun sends for these deliveries
UPDATE delivery_orders
SET notification_sent = FALSE
WHERE id IN (/* list of failed delivery IDs */);

-- Then run script again
node server/scripts/dailySendDeliveryImages.ts --date 2026-05-08
```

## Future Enhancements

- [ ] SMS fallback if Zalo fails
- [ ] Email fallback if phone not available
- [ ] Customer opt-in/opt-out preferences
- [ ] Batch image packaging (multiple images in one carousel message)
- [ ] Delivery confirmation replies (webhook listener for "delivered" responses)
- [ ] A/B testing of message templates
