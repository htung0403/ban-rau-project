import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'date-fns';
import { logger } from '../../utils/logger';
import { DeliveryNoteGenerator } from '../../utils/deliveryNoteGenerator';

// zca-js exports vary by module mode; require() keeps this service compatible in this codebase.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Zalo, ThreadType } = require('zca-js') as {
  Zalo: new (options?: Record<string, unknown>) => any;
  ThreadType: { User: number; Group: number };
};

type ZcaApi = any;
type ZcaCredentials = {
  imei: string;
  cookie: unknown;
  userAgent: string;
  language?: string;
};
type ZcaAttachmentSource = {
  data: Buffer;
  filename: `${string}.${string}`;
  metadata: {
    totalSize: number;
    width?: number;
    height?: number;
  };
};

export interface SendImageMessageOptions {
  recipientPhone: string;
  imageUrls: string[];
  caption?: string;
  retryCount?: number;
  attachments?: ZcaAttachmentSource[];
}

export interface SendImageMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
  recipientPhone: string;
}

export class ZaloService {
  private zaloClient: any;
  private api: ZcaApi | null = null;
  private loginPromise: Promise<ZcaApi> | null = null;
  private readonly enableSends: boolean;

  private qrLoginState: {
    status: 'idle' | 'generating' | 'waiting' | 'success' | 'failed';
    qrBase64?: string;
    error?: string;
  } = { status: 'idle' };

  constructor() {
    this.zaloClient = new Zalo({
      logging: false,
      checkUpdate: false,
      selfListen: false,
    });
    this.enableSends = process.env.ZALO_ENABLE_SENDS === 'true';
  }

  async refreshAccessToken(): Promise<boolean> {
    return true;
  }

  async sendImageMessage(options: SendImageMessageOptions): Promise<SendImageMessageResult> {
    const { recipientPhone, imageUrls, caption = '', attachments: providedAttachments } = options;

    if (!this.enableSends) {
      return {
        success: false,
        error: 'Zalo send is disabled by config (ZALO_ENABLE_SENDS=true)',
        recipientPhone,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const api = await this.ensureApi();
      const threadId = await this.resolveUserThreadIdByPhone(api, recipientPhone);

      if (!threadId) {
        return {
          success: false,
          error: `Cannot resolve Zalo user from phone ${recipientPhone}`,
          recipientPhone,
          timestamp: new Date().toISOString(),
        };
      }

      const fetchedAttachments = await this.buildImageAttachments(imageUrls);
      const attachments = [...(providedAttachments || []), ...fetchedAttachments];

      if (attachments.length === 0) {
        return {
          success: false,
          error: 'No image attachments provided or able to be fetched',
          recipientPhone,
          timestamp: new Date().toISOString(),
        };
      }

      const response = await api.sendMessage(
        {
          msg: caption || 'Hình ảnh từ đơn hàng của bạn',
          attachments,
        },
        threadId,
        ThreadType.User,
      );

      const messageId = response?.message?.msgId
        ? String(response.message.msgId)
        : response?.attachment?.[0]?.msgId
          ? String(response.attachment[0].msgId)
          : undefined;

      logger.info(`[ZaloService] Message sent to ${recipientPhone} (thread ${threadId})`);

      return {
        success: true,
        messageId,
        recipientPhone,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Unknown error';
      logger.error(`[ZaloService] Failed to send to ${recipientPhone}: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        recipientPhone,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async generateLoginQR(supabaseService: any): Promise<string> {
    if (this.qrLoginState.status === 'generating' || this.qrLoginState.status === 'waiting') {
      if (this.qrLoginState.qrBase64) return this.qrLoginState.qrBase64;
    }

    this.qrLoginState = { status: 'generating' };

    try {
      const qrPath = path.resolve(process.cwd(), 'tmp', `qr-${Date.now()}.png`);
      const qrDir = path.dirname(qrPath);
      if (!require('node:fs').existsSync(qrDir)) {
        require('node:fs').mkdirSync(qrDir, { recursive: true });
      }

      const userAgent =
        process.env.ZCA_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

      this.zaloClient
        .loginQR(
          {
            qrPath,
            userAgent,
          },
          async (event: any) => {
            logger.info(`[ZaloService] QR Login Event: Type ${event?.type}`);

            if (event?.type === 0) {
              // QR Generated
              if (event.actions?.saveToFile) {
                await event.actions.saveToFile(qrPath);
              }
              const qrBuffer = await require('node:fs/promises').readFile(qrPath);
              this.qrLoginState.qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
              this.qrLoginState.status = 'waiting';
              // Clean up temp file
              try {
                require('node:fs').unlinkSync(qrPath);
              } catch (e) { }
            } else if (event?.type === 2) {
              this.qrLoginState.status = 'waiting';
            } else if (event?.type === 4) {
              this.qrLoginState.status = 'success';
            } else if (event?.type === 1 || event?.type === 3) {
              this.qrLoginState.status = 'failed';
              this.qrLoginState.error = 'QR Expired or Declined';
            }
          },
        )
        .then(async (api: any) => {
          this.api = api;
          const context = api.getContext();
          const credentials = {
            cookie: context.cookie.toJSON()?.cookies || [],
            imei: context.imei,
            userAgent: context.userAgent,
            language: context.language || 'vi',
          };

          await supabaseService.from('general_settings').upsert({
            setting_key: 'ZCA_CREDENTIALS',
            setting_value: JSON.stringify(credentials),
            updated_at: new Date().toISOString(),
          });

          logger.info('[ZaloService] QR Login successful and credentials saved to DB');
        })
        .catch((err: any) => {
          logger.error('[ZaloService] QR Login failed:', err);
          this.qrLoginState.status = 'failed';
          this.qrLoginState.error = String(err);
        });

      let attempts = 0;
      while (attempts < 30) {
        if (this.qrLoginState.qrBase64) return this.qrLoginState.qrBase64;
        if (this.qrLoginState.status === 'failed') throw new Error(this.qrLoginState.error);
        await new Promise((r) => setTimeout(r, 500));
        attempts++;
      }

      throw new Error('Timeout waiting for QR generation');
    } catch (err) {
      this.qrLoginState.status = 'failed';
      this.qrLoginState.error = String(err);
      throw err;
    }
  }

  getQRStatus() {
    return this.qrLoginState;
  }

  /**
   * Proactively checks if the current/saved credentials are valid.
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const api = await this.ensureApi();
      if (api && typeof api === 'object') {
        return { connected: true };
      }
      return { connected: false, error: 'API not initialized' };
    } catch (err) {
      this.api = null;
      this.loginPromise = null;
      return { connected: false, error: String(err) };
    }
  }

  private async ensureApi(): Promise<ZcaApi> {
    if (this.api) return this.api;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = (async () => {
      try {
        let credentials: any = null;

        const { supabaseService } = require('../../config/supabase');
        const { data: dbCreds } = await supabaseService
          .from('general_settings')
          .select('setting_value')
          .eq('setting_key', 'ZCA_CREDENTIALS')
          .maybeSingle();

        if (dbCreds?.setting_value) {
          credentials = JSON.parse(dbCreds.setting_value);
          logger.info('[ZaloService] Loading credentials from Database');
        } else if (process.env.ZCA_CREDENTIALS_JSON) {
          credentials = JSON.parse(process.env.ZCA_CREDENTIALS_JSON);
          logger.info('[ZaloService] Loading credentials from ENV JSON');
        } else if (process.env.ZCA_CREDENTIALS_PATH) {
          const credPath = path.resolve(process.cwd(), process.env.ZCA_CREDENTIALS_PATH);
          if (require('node:fs').existsSync(credPath)) {
            const content = require('node:fs').readFileSync(credPath, 'utf8');
            credentials = JSON.parse(content);
            logger.info('[ZaloService] Loading credentials from File');
          }
        }

        if (!credentials) {
          throw new Error('No Zalo credentials found in DB, ENV, or File. Please login via QR.');
        }

        try {
          const api = await this.zaloClient.login(credentials);
          this.api = api;
          return api;
        } catch (loginErr: any) {
          // Credentials exist in DB but are invalid/expired - clear them so user can re-login
          const errorMsg = String(loginErr?.message || loginErr);
          logger.warn(`[ZaloService] Stored credentials invalid: ${errorMsg}. Clearing from DB.`);

          if (dbCreds?.setting_value) {
            try {
              await supabaseService
                .from('general_settings')
                .delete()
                .eq('setting_key', 'ZCA_CREDENTIALS');
              logger.info('[ZaloService] Cleared invalid ZCA_CREDENTIALS from database');
            } catch (deleteErr) {
              logger.error('[ZaloService] Failed to clear invalid credentials:', deleteErr);
            }
          }

          throw new Error(`Zalo session expired or invalid. Please login via QR code. (${errorMsg})`);
        }
      } catch (err) {
        this.loginPromise = null;
        throw err;
      } finally {
        this.loginPromise = null;
      }
    })();

    return this.loginPromise;
  }

  async sendDeliveryImagesImmediate(
    deliveryId: string,
    supabaseService: any,
    logger: any,
    normalizePhoneForAuth: (phone: string) => string | null,
    newAssignmentIds?: string[],
  ): Promise<void> {
    try {
      if (process.env.ZALO_ENABLE_SENDS !== 'true') {
        logger.info(`[ZaloService] Sends disabled (ZALO_ENABLE_SENDS != true), skipping delivery ${deliveryId}`);
        return;
      }

      const { data: shopNameSetting } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'SHOP_NAME')
        .maybeSingle();
      const shopName = shopNameSetting?.setting_value || 'Năm Sự';

      const { data: delivery, error } = await supabaseService
        .from('delivery_orders')
        .select(
          `
          *,
          import_orders (
            id, receiver_phone, customer_id, customers:customers!import_orders_customer_id_fkey (id, phone, name), selected_alias
          ),
          vegetable_orders (
            id, receiver_phone, customer_id, customers:customers!vegetable_orders_customer_id_fkey (id, phone, name), selected_alias
          ),
          delivery_vehicles (
            id, assigned_quantity, expected_amount, delivery_time, delivery_date, image_urls,
            profiles (full_name),
            vehicles (license_plate)
          )
        `,
        )
        .eq('id', deliveryId)
        .single();

      if (error || !delivery) {
        logger.error(`[ZaloService] Failed to fetch delivery ${deliveryId}:`, error);
        return;
      }

      const deliveryNoteBuffers: Buffer[] = [];
      const customerName =
        delivery.import_orders?.customers?.name ||
        delivery.import_orders?.selected_alias ||
        delivery.vegetable_orders?.customers?.name ||
        delivery.vegetable_orders?.selected_alias ||
        'Khách hàng';

      let assignmentsToNotify = (delivery.delivery_vehicles || []);
      if (newAssignmentIds && newAssignmentIds.length > 0) {
        assignmentsToNotify = assignmentsToNotify.filter((dv: any) => newAssignmentIds.includes(dv.id));
      } else if (newAssignmentIds) {
        logger.info(`[ZaloService] No new/modified assignments for delivery ${deliveryId}, skipping`);
        return;
      }

      for (const dv of assignmentsToNotify) {
        try {
          const noteBuffer = await DeliveryNoteGenerator.generatePng({
            shopName,
            customerName,
            deliveryTime:
              dv.delivery_time || delivery.delivery_time || format(new Date(), 'HH:mm'),
            quantity: dv.assigned_quantity || 0,
            productName: delivery.product_name || '-',
            price: dv.unit_price || delivery.unit_price || 0,
            total: dv.expected_amount || 0,
            deliveryDate:
              dv.delivery_date ||
              delivery.delivery_date ||
              format(new Date(), 'dd/MM/yyyy'),
            staffName: dv.profiles?.full_name || 'NV Giao hàng',
            licensePlate: dv.vehicles?.license_plate || '-',
          });
          deliveryNoteBuffers.push(noteBuffer);
        } catch (genErr) {
          logger.error(`[ZaloService] Failed to generate delivery note for assignment:`, genErr);
        }
      }

      const noteAttachments: ZcaAttachmentSource[] = deliveryNoteBuffers.map((buf, i) => ({
        data: buf,
        filename: `phieu-giao-hang-${deliveryId}-${Date.now()}-${i}.png`,
        metadata: {
          totalSize: buf.length,
        },
      }));

      const recipientPhone = this.buildRecipientPhoneForDelivery(delivery);
      if (!recipientPhone) {
        logger.warn(`[ZaloService] Delivery ${deliveryId}: no recipient phone found, skipping`);
        return;
      }

      const normalizedPhone = normalizePhoneForAuth(recipientPhone);
      if (!normalizedPhone) {
        logger.warn(`[ZaloService] Delivery ${deliveryId}: phone normalization failed for ${recipientPhone}`);
        return;
      }

      const clientUrl = process.env.CLIENT_URL || 'https://nhaxenamsu.vercel.app';

      const result = await this.sendImageMessage({
        recipientPhone: normalizedPhone,
        imageUrls: [],
        attachments: noteAttachments,
        caption: `Thông tin giao hàng đơn #${delivery.id}\nXem chi tiết: ${clientUrl}/don-giao/${delivery.id}`,
      });

      if (result.success) {
        logger.info(`[ZaloService] Immediate send successful for delivery ${deliveryId}, message ${result.messageId}`);
      } else {
        logger.error(`[ZaloService] Immediate send failed for delivery ${deliveryId}: ${result.error}`);
      }
    } catch (err) {
      logger.error(`[ZaloService] Exception in sendDeliveryImagesImmediate:`, err);
    }
  }

  private async resolveUserThreadIdByPhone(api: ZcaApi, phone: string): Promise<string | null> {
    const overrideMapJson = process.env.ZCA_RECIPIENT_MAP_JSON;
    if (overrideMapJson) {
      try {
        const mapped = JSON.parse(overrideMapJson) as Record<string, string>;
        if (mapped[phone]) return mapped[phone];
      } catch (err) {
        logger.warn('[ZaloService] Invalid ZCA_RECIPIENT_MAP_JSON:', err);
      }
    }

    const result: any = await api.findUser(phone);
    const changedProfiles = result?.changed_profiles as Record<string, unknown> | undefined;
    if (changedProfiles && typeof changedProfiles === 'object') {
      const keys = Object.keys(changedProfiles);
      if (keys.length > 0) {
        return String(keys[0]).split('_')[0] || null;
      }
    }

    const directId = result?.uid || result?.userId || result?.data?.uid || result?.data?.userId || result?.data?.id;
    return directId ? String(directId) : null;
  }

  private async buildImageAttachments(imageUrls: string[]): Promise<ZcaAttachmentSource[]> {
    const limitedUrls = imageUrls.slice(0, 5);
    const attachments: ZcaAttachmentSource[] = [];

    for (let i = 0; i < limitedUrls.length; i++) {
      const url = limitedUrls[i];
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const data = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = this.extensionFromContentType(contentType);

        attachments.push({
          data,
          filename: `delivery-${Date.now()}-${i}.${ext}`,
          metadata: {
            totalSize: data.length,
          },
        });
      } catch (err) {
        logger.warn(`[ZaloService] Failed to fetch attachment from URL ${url}:`, err);
      }
    }

    return attachments;
  }

  private extensionFromContentType(contentType: string): string {
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif')) return 'gif';
    return 'jpg';
  }

  async sendDailySummaries(supabaseService: any, logger: any, normalizePhoneForAuth: (phone: string) => string | null): Promise<void> {
    try {
      if (process.env.ZALO_ENABLE_SENDS !== 'true') return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 0. Distributed Lock: Check if already run today to avoid double sending from multiple instances
      const { data: lastRun } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'ZALO_LAST_SUMMARY_RUN')
        .maybeSingle();

      if (lastRun?.setting_value === today) {
        logger.info(`[ZaloService] Daily summary already processed for ${today}, skipping.`);
        return;
      }

      // Mark as run immediately (best-effort lock)
      await supabaseService.from('general_settings').upsert({
        setting_key: 'ZALO_LAST_SUMMARY_RUN',
        setting_value: today,
        updated_at: new Date().toISOString(),
      });

      logger.info(`[ZaloService] Starting daily summary generation for ${today}`);

      // 1. Fetch shop name
      const { data: shopNameSetting } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'SHOP_NAME')
        .maybeSingle();
      const shopName = shopNameSetting?.setting_value || 'Năm Sự';

      // 2. Fetch all assignments for today with full details
      const { data: assignments, error } = await supabaseService
        .from('delivery_vehicles')
        .select(`
          *,
          delivery_orders (
            id, product_name, delivery_date, unit_price,
            import_orders (
              receiver_phone, selected_alias, customers:customers!import_orders_customer_id_fkey (id, phone, name)
            ),
            vegetable_orders (
              receiver_phone, selected_alias, customers:customers!vegetable_orders_customer_id_fkey (id, phone, name)
            )
          ),
          profiles (full_name),
          vehicles (license_plate)
        `)
        .eq('delivery_date', today);

      if (error) throw error;
      if (!assignments || assignments.length === 0) {
        logger.info(`[ZaloService] No assignments found for ${today}, skipping summary.`);
        return;
      }

      // 3. Group by customer phone
      const customerGroups: Record<string, { customerName: string; phone: string; items: any[] }> = {};

      for (const dv of assignments) {
        const order = dv.delivery_orders;
        if (!order) continue;

        const phone = this.buildRecipientPhoneForDelivery(order);
        if (!phone) continue;

        const customerName =
          order.import_orders?.customers?.name ||
          order.import_orders?.selected_alias ||
          order.vegetable_orders?.customers?.name ||
          order.vegetable_orders?.selected_alias ||
          'Khách hàng';

        if (!customerGroups[phone]) {
          customerGroups[phone] = { customerName, phone, items: [] };
        }

        customerGroups[phone].items.push({
          deliveryTime: dv.delivery_time || format(new Date(), 'HH:mm'),
          licensePlate: dv.vehicles?.license_plate || '-',
          staffName: dv.profiles?.full_name || 'NV Giao hàng',
          quantity: dv.assigned_quantity || 0,
          productName: order.product_name || '-',
          price: dv.unit_price || order.unit_price || 0,
          total: dv.expected_amount || 0,
        });
      }

      // 4. Generate and send for each group
      for (const phone of Object.keys(customerGroups)) {
        const group = customerGroups[phone];
        const normalizedPhone = normalizePhoneForAuth(group.phone);
        if (!normalizedPhone) continue;

        try {
          const noteBuffer = await DeliveryNoteGenerator.generateSummaryPng({
            shopName,
            customerName: group.customerName,
            deliveryDate: format(new Date(), 'dd/MM/yyyy'),
            items: group.items,
          });

          const result = await this.sendImageMessage({
            recipientPhone: normalizedPhone,
            imageUrls: [],
            attachments: [{
              data: noteBuffer,
              filename: `phieu-tong-${today}-${Date.now()}.png`,
              metadata: { totalSize: noteBuffer.length },
            }],
            caption: `Phiếu tổng kết giao hàng ngày ${format(new Date(), 'dd/MM/yyyy')}`,
          });

          if (result.success) {
            logger.info(`[ZaloService] Daily summary sent to ${group.customerName} (${normalizedPhone})`);
          } else {
            logger.error(`[ZaloService] Failed to send summary to ${normalizedPhone}: ${result.error}`);
          }
        } catch (err) {
          logger.error(`[ZaloService] Error processing summary for ${group.customerName}:`, err);
        }
      }
    } catch (err) {
      logger.error(`[ZaloService] Exception in sendDailySummaries:`, err);
    }
  }

  private buildRecipientPhoneForDelivery(delivery: any): string | null {
    if (delivery.import_orders?.receiver_phone) return delivery.import_orders.receiver_phone;
    if (delivery.import_orders?.customers?.phone) return delivery.import_orders.customers.phone;
    if (delivery.vegetable_orders?.receiver_phone) return delivery.vegetable_orders.receiver_phone;
    if (delivery.vegetable_orders?.customers?.phone) return delivery.vegetable_orders.customers.phone;
    return null;
  }
}

export const zaloService = new ZaloService();
