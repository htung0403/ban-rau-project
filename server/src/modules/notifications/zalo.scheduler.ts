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

export const initZaloScheduler = () => {
  // Schedule daily summary at 17:00 VN time
  cron.schedule('0 17 * * *', async () => {
    logger.info('[ZaloScheduler] Running daily summary job at 17:00 VN');
    try {
      await zaloService.sendDailySummaries(supabaseService, logger, normalizePhoneForAuth);
    } catch (err) {
      logger.error('[ZaloScheduler] Daily summary job failed:', err);
    }
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });

  // Check Zalo connection every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await checkZaloConnection();
  });

  logger.info('[ZaloScheduler] Daily summary job scheduled for 17:00 Asia/Ho_Chi_Minh');
  logger.info('[ZaloScheduler] Zalo connection check scheduled every 30 minutes');
};
