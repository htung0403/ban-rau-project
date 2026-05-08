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

export const initZaloScheduler = () => {
  // Schedule daily summary at 17:00 VN time
  cron.schedule('0 16 * * *', async () => {
    logger.info('[ZaloScheduler] Running daily summary job at 17:00 VN');
    try {
      await zaloService.sendDailySummaries(supabaseService, logger, normalizePhoneForAuth);
    } catch (err) {
      logger.error('[ZaloScheduler] Daily summary job failed:', err);
    }
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });

  logger.info('[ZaloScheduler] Daily summary job scheduled for 17:00 Asia/Ho_Chi_Minh');
};
