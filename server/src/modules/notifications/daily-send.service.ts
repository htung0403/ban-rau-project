import { supabaseService } from '../../config/supabase';
import { normalizePhoneForAuth } from '../../utils/phoneAuth';
import { zaloService, SendImageMessageResult } from './zalo.service';
import { logger } from '../../utils/logger';

/**
 * Daily send service: aggregates deliveries with images and sends them to customers.
 *
 * Responsibilities:
 * - Query deliveries created on target date with images and not yet sent
 * - Build phone recipients (with fallback: receiver_phone → customer.phone → skip)
 * - Send images via Zalo OA
 * - Log results to notification_logs table for audit and retry
 */

export interface DailySendResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number; // No recipient phone found
  startTime: string;
  endTime: string;
}

export class DailySendService {
  /**
   * Run daily send for a specific date (default: today).
   * Sends images from all deliveries created on that date.
   */
  async runDailySend(targetDate?: string): Promise<DailySendResult> {
    const date = targetDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const startTime = new Date().toISOString();

    logger.info(`[DailySendService] Starting daily send for ${date}`);

    try {
      const deliveries = await this.fetchDeliveriesToSend(date);
      logger.info(`[DailySendService] Found ${deliveries.length} deliveries to send`);

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const delivery of deliveries) {
        const result = await this.sendDeliveryImages(delivery, date);

        if (result.skipped) {
          skipped++;
        } else if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }

      const endTime = new Date().toISOString();
      logger.info(
        `[DailySendService] Daily send complete: sent=${sent}, failed=${failed}, skipped=${skipped}, total=${deliveries.length}`,
      );

      return { total: deliveries.length, sent, failed, skipped, startTime, endTime };
    } catch (err) {
      logger.error('[DailySendService] Fatal error in runDailySend:', err);
      throw err;
    }
  }

  /**
   * Fetch deliveries created on target date that have images and notification_sent = false.
   */
  private async fetchDeliveriesToSend(date: string) {
    try {
      // Query: delivery_orders created on target date, with images, and not yet sent
      const { data, error } = await supabaseService
        .from('delivery_orders')
        .select(
          `
          id,
          image_urls,
          import_order_id,
          vegetable_order_id,
          notification_sent,
          import_orders (
            id,
            receiver_phone,
            customer_id,
            customers (
              id,
              phone
            )
          ),
          vegetable_orders (
            id,
            receiver_phone,
            customer_id,
            customers (
              id,
              phone
            )
          )
        `,
        )
        .gte('created_at', `${date}T00:00:00Z`)
        .lt('created_at', `${date}T23:59:59Z`)
        .eq('notification_sent', false)
        .not('image_urls', 'is', null);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      logger.error('[DailySendService] Error fetching deliveries:', err);
      return [];
    }
  }

  /**
   * Send images for a single delivery and log result.
   */
  private async sendDeliveryImages(
    delivery: any,
    date: string,
  ): Promise<{ success: boolean; skipped: boolean }> {
    try {
      const imageUrls = Array.isArray(delivery.image_urls) ? delivery.image_urls : [];

      if (!imageUrls || imageUrls.length === 0) {
        logger.debug(`[DailySendService] Delivery ${delivery.id} has no images, skipping`);
        return { success: false, skipped: true };
      }

      // Build recipient phone with fallback priority
      const recipientPhone = this.buildRecipientPhone(delivery);

      if (!recipientPhone) {
        logger.warn(`[DailySendService] Delivery ${delivery.id}: no recipient phone found, skipping`);
        await this.logNotification(delivery.id, 'skipped', null, 'No recipient phone found', imageUrls);
        return { success: false, skipped: true };
      }

      // Normalize phone for Zalo
      const normalizedPhone = normalizePhoneForAuth(recipientPhone);

      if (!normalizedPhone) {
        logger.warn(`[DailySendService] Delivery ${delivery.id}: phone normalization failed, skipping`);
        await this.logNotification(delivery.id, 'failed', recipientPhone, 'Invalid phone format', imageUrls);
        return { success: false, skipped: true };
      }

      // Send via Zalo
      const sendResult = await zaloService.sendImageMessage({
        recipientPhone: normalizedPhone,
        imageUrls,
        caption: `Hình ảnh giao hàng đơn #${delivery.id}`,
      });

      if (sendResult.success) {
        await this.logNotification(delivery.id, 'sent', recipientPhone, null, imageUrls, sendResult.messageId);
        await this.markDeliverySent(delivery.id);
        return { success: true, skipped: false };
      } else {
        await this.logNotification(delivery.id, 'failed', recipientPhone, sendResult.error || 'Unknown error', imageUrls);
        return { success: false, skipped: false };
      }
    } catch (err) {
      logger.error(`[DailySendService] Error processing delivery ${delivery.id}:`, err);
      await this.logNotification(delivery.id, 'failed', null, `Exception: ${err}`, []);
      return { success: false, skipped: false };
    }
  }

  /**
   * Build recipient phone with fallback priority.
   * Priority: import_orders.receiver_phone → vegetable_orders.receiver_phone → customers.phone → skip
   */
  private buildRecipientPhone(delivery: any): string | null {
    // Try import order receiver phone
    if (delivery.import_orders?.receiver_phone) {
      return delivery.import_orders.receiver_phone;
    }

    // Try import order customer phone
    if (delivery.import_orders?.customers?.phone) {
      return delivery.import_orders.customers.phone;
    }

    // Try vegetable order receiver phone
    if (delivery.vegetable_orders?.receiver_phone) {
      return delivery.vegetable_orders.receiver_phone;
    }

    // Try vegetable order customer phone
    if (delivery.vegetable_orders?.customers?.phone) {
      return delivery.vegetable_orders.customers.phone;
    }

    return null;
  }

  /**
   * Log notification attempt to notification_logs table.
   */
  private async logNotification(
    deliveryId: string,
    status: 'sent' | 'failed' | 'skipped',
    recipientPhone: string | null,
    errorMsg: string | null,
    imageUrls: string[],
    messageId?: string,
  ) {
    try {
      const { error } = await supabaseService.from('notification_logs').insert([
        {
          delivery_id: deliveryId,
          provider: 'zalo_zca',
          status,
          recipient_phone: recipientPhone,
          message_id: messageId || null,
          image_count: imageUrls.length,
          error_message: errorMsg,
          sent_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        logger.error(`[DailySendService] Failed to log notification for delivery ${deliveryId}:`, error);
      }
    } catch (err) {
      logger.error(`[DailySendService] Exception logging notification:`, err);
    }
  }

  /**
   * Mark delivery as notification_sent.
   */
  private async markDeliverySent(deliveryId: string) {
    try {
      const { error } = await supabaseService
        .from('delivery_orders')
        .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
        .eq('id', deliveryId);

      if (error) {
        logger.error(`[DailySendService] Failed to update delivery ${deliveryId}:`, error);
      }
    } catch (err) {
      logger.error(`[DailySendService] Exception updating delivery:`, err);
    }
  }
}

export const dailySendService = new DailySendService();
