# Zalo Image Delivery — Quick Reference

## 📋 What Was Built

Two-mode automatic image delivery to customers via Zalo:
- **Immediate**: sends images when vehicle assignment is saved (async, non-blocking)
- **Daily**: aggregates and sends images from all deliveries created on a date (scheduled job)

## 🚀 Quick Start (5 steps)

### 1️⃣ Get Zalo Credentials
- Go to [https://oa.zalo.me/](https://oa.zalo.me/) and register
- Get `App ID` and `App Secret`
- Get initial `Access Token` from OAuth endpoint
- See `server/docs/ZALO_SETUP.md` for full guide

### 2️⃣ Set Environment Variables
```bash
# Copy and edit in your .env or deployment secrets:
cat server/.env.zalo.example >> .env
# Then fill in your credentials
```

### 3️⃣ Run Database Migration
```bash
# In Supabase dashboard, run the migration SQL:
# server/database/migrations/20260508_add_notification_logs.sql
```

### 4️⃣ Deploy Code
```bash
# Code already integrated in delivery.service.ts
# Just deploy your app normally
cd server && npm run build && npm start
```

### 5️⃣ Configure Daily Cron
**Option A (recommended): External cron**
```bash
crontab -e
# Add: 0 8 * * * cd /path/to/app && node server/scripts/dailySendDeliveryImages.ts
```

**Option B: In-app cron (single-worker only)**
```bash
# Set ENABLE_IN_APP_CRON=true and deploy
```

## ✅ Test It

1. **Immediate send:**
   - Assign vehicle to delivery with image in UI
   - Check server logs for `[ZaloService] Immediate send successful`
   - Customer receives message on Zalo (if they've messaged OA)

2. **Daily send:**
   ```bash
   node server/scripts/dailySendDeliveryImages.ts --date 2026-05-08
   ```
   - Check logs: `Daily send completed: total=X, sent=Y, failed=Z`
   - Verify DB: `SELECT * FROM notification_logs LIMIT 5`

## 📂 Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `zalo.service.ts` | 290 | Zalo API client |
| `daily-send.service.ts` | 220 | Daily batch send |
| `dailySendDeliveryImages.ts` | 60 | CLI for cron |
| `20260508_add_notification_logs.sql` | 80 | DB schema |
| `ZALO_SETUP.md` | 350+ | Full guide |
| `ZALO_IMPLEMENTATION_GUIDE.md` | 300+ | Deployment steps |
| `.env.zalo.example` | 25 | Env template |

## 🔗 Modified Files

- `server/src/modules/delivery/delivery.service.ts` — Added immediate Zalo send after assignments

## 📖 Docs Location

- **Setup & credentials:** `server/docs/ZALO_SETUP.md`
- **Deployment steps:** `server/docs/ZALO_IMPLEMENTATION_GUIDE.md`
- **Env template:** `server/.env.zalo.example`

## ⚠️ Important Notes

1. **Zalo OA Constraints:**
   - Customers must have messaged OA or followed it to receive messages
   - Access tokens expire after ~1 hour (auto-refreshed)
   - Rate limits apply per-account

2. **Phone Fallback Priority:**
   - `receiver_phone` → `customer.phone` → skip

3. **Logging:**
   - All sends logged to `notification_logs` table (audit trail)
   - Can retry failed sends manually

4. **Fire-and-Forget:**
   - Immediate sends don't block assignment flow (async)
   - Errors logged but don't affect UI

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No env vars set | Copy `.env.zalo.example` to `.env` and fill in credentials |
| DB tables missing | Run migration: `ZALO_SETUP.md` → Step 2 |
| Sends not working | Check `notification_logs` table for errors |
| Cron not running | Verify with `crontab -l` and check logs |
| Customers not receiving | They must have messaged OA first |

## 📊 Monitor

```sql
-- Check recent sends
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;

-- Daily summary
SELECT DATE(sent_at), COUNT(*), 
  SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
FROM notification_logs GROUP BY DATE(sent_at) ORDER BY DATE DESC;
```

## 🎯 Next Steps

1. Get Zalo credentials (Step 1 above)
2. Follow `ZALO_IMPLEMENTATION_GUIDE.md` for full deployment
3. Test immediate send (assign vehicle + check logs)
4. Set up daily cron (external or in-app)
5. Monitor in `notification_logs` table

---

**Full documentation:** See `server/docs/ZALO_SETUP.md` and `server/docs/ZALO_IMPLEMENTATION_GUIDE.md`
