import cron from 'node-cron';
import { zaloService } from './zalo.service';
import { supabaseService } from '../../config/supabase';
import { logger } from '../../utils/logger';

/**
 * Normalizes phone numbers to Zalo format (+84...)
 */
const normalizePhoneForAuth = (phone: string): string | null => {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '84' + clean.slice(1);
  }
  if (!clean.startsWith('84')) {
    clean = '84' + clean;
  }
  return '+' + clean;
};

/**
 * Creates a system notification for admins
 */
const createAdminNotification = async (
  title: string,
  description: string,
  type: 'info' | 'warning' | 'success' = 'warning'
) => {
  try {
    const { data: admins } = await supabaseService
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (!admins || admins.length === 0) {
      logger.warn('[ZaloScheduler] No admin users found to notify');
      return;
    }

    const notifications = admins.map(admin => ({
      user_id: admin.id,
      title,
      description,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    await supabaseService.from('notifications').insert(notifications);
    logger.info(`[ZaloScheduler] Admin notification created: ${title}`);
  } catch (err) {
    logger.error('[ZaloScheduler] Failed to create admin notification:', err);
  }
};

/**
 * Check Zalo connection status every 30 minutes
 */
const checkZaloConnection = async () => {
  logger.info('[ZaloScheduler] Checking Zalo connection status...');
  try {
    const connection = await zaloService.checkConnection();

    if (!connection.connected) {
      logger.warn('[ZaloScheduler] Zalo connection failed. Sending alert to admins.');
      await createAdminNotification(
        '⚠️ Zalo Notification mất kết nối',
        connection.error || 'Phiên Zalo đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại qua QR code trong trang Cài đặt.',
        'warning'
      );
    } else {
      logger.info('[ZaloScheduler] Zalo connection is healthy');
    }
  } catch (err) {
    logger.error('[ZaloScheduler] Failed to check Zalo connection:', err);
    await createAdminNotification(
      '❌ Lỗi kiểm tra Zalo',
      `Không thể kiểm tra kết nối Zalo: ${String(err)}`,
      'warning'
    );
  }
};

// --- Dynamic Scheduling Logic ---

let cachedSettings: Record<string, string> = {
  zalo_summary_time_grocery: '17:00',
  zalo_summary_time_supplier: '17:00',
  zalo_summary_time_sender: '17:00',
};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const updateSettingsCache = async () => {
  try {
    const { data } = await supabaseService
      .from('general_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'zalo_summary_time_grocery',
        'zalo_summary_time_supplier',
        'zalo_summary_time_sender'
      ]);

    if (data) {
      data.forEach(s => {
        cachedSettings[s.setting_key] = s.setting_value;
      });
      lastCacheUpdate = Date.now();
      logger.info('[ZaloScheduler] Settings cache updated');
    }
  } catch (err) {
    logger.error('[ZaloScheduler] Failed to update settings cache:', err);
  }
};

export const initZaloScheduler = () => {
  // 1. Initial cache update
  updateSettingsCache();

  // 2. Check every minute if any summary should be sent
  cron.schedule('* * * * *', async () => {
    // Refresh cache if expired
    if (Date.now() - lastCacheUpdate > CACHE_TTL) {
      await updateSettingsCache();
    }

    const nowVN = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    logger.info(`[ZaloScheduler] Minute check: ${nowVN} | Cached times: G:${cachedSettings.zalo_summary_time_grocery} V:${cachedSettings.zalo_summary_time_supplier} S:${cachedSettings.zalo_summary_time_sender}`);

    // Check Grocery Summary
    if (nowVN === cachedSettings.zalo_summary_time_grocery) {
      logger.info(`[ZaloScheduler] Triggering grocery summary at ${nowVN}`);
      zaloService.sendDailySummaries(supabaseService, logger, normalizePhoneForAuth).catch(err => {
        logger.error('[ZaloScheduler] Grocery summary job failed:', err);
      });
    }

    // Check Supplier Summary
    if (nowVN === cachedSettings.zalo_summary_time_supplier) {
      logger.info(`[ZaloScheduler] Triggering supplier summary at ${nowVN}`);
      zaloService.sendDailySupplierSummaries(supabaseService, logger, normalizePhoneForAuth).catch(err => {
        logger.error('[ZaloScheduler] Supplier summary job failed:', err);
      });
    }

    // Check Sender Summary
    if (nowVN === cachedSettings.zalo_summary_time_sender) {
      logger.info(`[ZaloScheduler] Triggering sender summary at ${nowVN}`);
      zaloService.sendDailySenderSummaries(supabaseService, logger, normalizePhoneForAuth).catch(err => {
        logger.error('[ZaloScheduler] Sender summary job failed:', err);
      });
    }
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });

  // 3. Check Zalo connection every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await checkZaloConnection();
  });

  logger.info('[ZaloScheduler] Dynamic daily summary job initialized');
  logger.info('[ZaloScheduler] Zalo connection check scheduled every 30 minutes');
};
