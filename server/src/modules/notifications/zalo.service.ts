import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'date-fns';
import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { DeliveryNoteGenerator } from '../../utils/deliveryNoteGenerator';
import { normalizePersonName } from '../../utils/goodsScope';

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

  /**
   * Generates a secure HMAC token for public summary access
   */
  generatePublicToken(type: string, id: string, date: string): string {
    const data = `${type}:${id}:${date}`;
    return crypto.createHmac('sha256', env.JWT_SECRET).update(data).digest('hex');
  }

  /**
   * Verifies a public summary token
   */
  verifyPublicToken(type: string, id: string, date: string, token: string): boolean {
    const expected = this.generatePublicToken(type, id, date);
    return expected === token;
  }

  async refreshAccessToken(): Promise<boolean> {
    return true;
  }

  async sendImageMessage(options: SendImageMessageOptions): Promise<SendImageMessageResult> {
    const { recipientPhone, imageUrls, caption = '', attachments: providedAttachments } = options;

    if (!this.enableSends) {
      return {
        success: false,
        error: 'Zalo send is disabled by config (ZALO_ENABLE_SENDS !== true)',
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
        caption: `Xem chi tiết: ${clientUrl}/don-giao/${delivery.id}`,
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

  async sendDailySummaries(supabaseService: any, logger: any, normalizePhoneForAuth: (phone: string) => string | null, targetCustomerId?: string): Promise<void> {
    try {
      if (process.env.ZALO_ENABLE_SENDS !== 'true') return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // 0. Distributed Lock: Check if already run today to avoid double sending from multiple instances
      const { data: lastRun } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'ZALO_LAST_SUMMARY_RUN')
        .maybeSingle();

      if (!targetCustomerId && lastRun?.setting_value === today) {
        logger.info(`[ZaloService] Daily summary already processed for ${today}, skipping.`);
        return;
      }

      // Mark as run immediately (best-effort lock)
      if (!targetCustomerId) {
        await supabaseService.from('general_settings').upsert({
          setting_key: 'ZALO_LAST_SUMMARY_RUN',
          setting_value: today,
          updated_at: new Date().toISOString(),
        });
      }

      logger.info(`[ZaloService] Starting daily summary generation for ${today}`);

      // 1. Fetch shop name
      const { data: shopNameSetting } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'SHOP_NAME')
        .maybeSingle();
      const shopName = shopNameSetting?.setting_value || 'Năm Sự';

      // 2. Fetch all assignments and orders for today
      const [assignmentsRes, ordersRes] = await Promise.all([
        supabaseService
          .from('delivery_vehicles')
          .select(`
            *,
            delivery_orders (
              id, product_name, delivery_date, unit_price, total_quantity, status,
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
          .eq('delivery_date', today),
        supabaseService
          .from('delivery_orders')
          .select(`
            id, product_name, delivery_date, unit_price, total_quantity, status,
            import_orders (
              receiver_phone, selected_alias, customers:customers!import_orders_customer_id_fkey (id, phone, name)
            ),
            vegetable_orders (
              receiver_phone, selected_alias, customers:customers!vegetable_orders_customer_id_fkey (id, phone, name)
            ),
            delivery_vehicles ( assigned_quantity )
          `)
          .eq('delivery_date', today)
          .neq('status', 'hang_o_sg')
      ]);

      const assignments = assignmentsRes.data || [];
      const ordersToday = ordersRes.data || [];

      if (assignments.length === 0 && ordersToday.length === 0) {
        logger.info(`[ZaloService] No assignments or orders found for ${today}, skipping summary.`);
        return;
      }

      // 3. Group by customer phone
      const customerGroups: Record<string, { customerId: string; customerName: string; phone: string; items: any[]; undeliveredOrderIds: Set<string>; undeliveredQuantity: number }> = {};

      const processOrderForUndelivered = (order: any, phone: string, customerName: string, customerId: string) => {
        if (!customerGroups[phone]) {
          customerGroups[phone] = { customerId, customerName, phone, items: [], undeliveredOrderIds: new Set(), undeliveredQuantity: 0 };
        }
        if (!customerGroups[phone].undeliveredOrderIds.has(order.id)) {
           const totalAssigned = (order.delivery_vehicles || []).reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
           const undelivered = (order.total_quantity || 0) - totalAssigned;
           if (undelivered > 0) {
             customerGroups[phone].undeliveredQuantity += undelivered;
             customerGroups[phone].undeliveredOrderIds.add(order.id);
           }
        }
      };

      // Process all orders for today (to catch unassigned quantities)
      for (const order of ordersToday) {
        if (order.status === 'hang_o_sg') continue;

        const phone = this.buildRecipientPhoneForDelivery(order);
        if (!phone) continue;

        const customerName =
          order.import_orders?.customers?.name ||
          order.import_orders?.selected_alias ||
          order.vegetable_orders?.customers?.name ||
          order.vegetable_orders?.selected_alias ||
          'Khách hàng';

        const customerId = order.import_orders?.customers?.id || order.vegetable_orders?.customers?.id;
        if (!customerId) continue;

        processOrderForUndelivered(order, phone, customerName, customerId);
      }

      // Process assignments for today (builds items list)
      for (const dv of assignments) {
        const order = dv.delivery_orders;
        if (!order || order.status === 'hang_o_sg') continue;

        const phone = this.buildRecipientPhoneForDelivery(order);
        if (!phone) continue;

        const customerName =
          order.import_orders?.customers?.name ||
          order.import_orders?.selected_alias ||
          order.vegetable_orders?.customers?.name ||
          order.vegetable_orders?.selected_alias ||
          'Khách hàng';

        const customerId = order.import_orders?.customers?.id || order.vegetable_orders?.customers?.id;
        if (!customerId) continue;

        if (!customerGroups[phone]) {
          customerGroups[phone] = { customerId, customerName, phone, items: [], undeliveredOrderIds: new Set(), undeliveredQuantity: 0 };
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

        // Filter by targetCustomerId if provided
        if (targetCustomerId && group.customerId !== targetCustomerId) continue;

        const normalizedPhone = normalizePhoneForAuth(group.phone);
        if (!normalizedPhone) continue;

        try {
          if (group.items.length === 0 && group.undeliveredQuantity === 0) continue;

          let caption = `Phiếu tổng kết giao hàng ngày ${format(new Date(), 'dd/MM/yyyy')}`;
          if (group.undeliveredQuantity > 0) {
            caption += `\n\nXin lỗi quý khách, hiện số kiện chưa được giao là ${group.undeliveredQuantity}. Mong quý khách thông cảm. Hẹn gặp lại vào ngày mai.`;
          } else {
            caption += `\n\nQuý khách đã được giao đủ hàng. Cảm ơn quý khách đã sử dụng dịch vụ.`;
          }

          const noteBuffer = await DeliveryNoteGenerator.generateSummaryPng({
            shopName,
            customerName: group.customerName,
            deliveryDate: format(new Date(), 'dd/MM/yyyy'),
            items: group.items,
          });

          // Generate public link
          const token = this.generatePublicToken('grocery', group.customerId, today);
          const publicLink = `${env.CLIENT_URL}/public/summary/grocery/${group.customerId}/${today}/${token}`;
          const finalCaption = `${caption}\n\nXem chi tiết tại: ${publicLink}`;

          const result = await this.sendImageMessage({
            recipientPhone: normalizedPhone,
            imageUrls: [],
            attachments: [{
              data: noteBuffer,
              filename: `phieu-tong-${today}-${Date.now()}.png`,
              metadata: { totalSize: noteBuffer.length },
            }],
            caption: finalCaption,
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

  async sendDailySupplierSummaries(supabaseService: any, logger: any, normalizePhoneForAuth: (phone: string) => string | null): Promise<void> {
    try {
      if (process.env.ZALO_ENABLE_SENDS !== 'true') return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Distributed Lock: Check if already run today to avoid double sending
      const { data: lastRun } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'ZALO_LAST_SUPPLIER_SUMMARY_RUN')
        .maybeSingle();

      if (lastRun?.setting_value === today) {
        logger.info(`[ZaloService] Daily supplier summary already processed for ${today}, skipping.`);
        return;
      }

      // Mark as run immediately (best-effort lock)
      await supabaseService.from('general_settings').upsert({
        setting_key: 'ZALO_LAST_SUPPLIER_SUMMARY_RUN',
        setting_value: today,
        updated_at: new Date().toISOString(),
      });

      logger.info(`[ZaloService] Starting daily supplier summary generation for ${today}`);

      // 1. Fetch all vegetable orders for today
      const { data: orders, error } = await supabaseService
        .from('vegetable_orders')
        .select(`
          *,
          customers:customers!vegetable_orders_customer_id_fkey(id, name, phone),
          vegetable_order_items(*, products(*)),
          delivery_orders(*, delivery_vehicles(*, vehicles(license_plate), profiles!driver_id(full_name)))
        `)
        .eq('order_date', today)
        .is('deleted_at', null);

      if (error) throw error;
      if (!orders || orders.length === 0) {
        logger.info(`[ZaloService] No vegetable orders found for ${today}, skipping supplier summary.`);
        return;
      }

      // 2. Group by Supplier (customer_id)
      const supplierGroups: Record<string, { supplierId: string; supplierName: string; phone: string; orders: any[] }> = {};

      orders.forEach((order: any) => {
        const supplier = order.customers;
        if (!supplier) return;

        const phone = supplier.phone;
        if (!phone) return;

        if (!supplierGroups[supplier.id]) {
          supplierGroups[supplier.id] = {
            supplierId: supplier.id,
            supplierName: supplier.name,
            phone: phone,
            orders: [],
          };
        }
        supplierGroups[supplier.id].orders.push(order);
      });

      // 3. Process each supplier group
      for (const supplierId of Object.keys(supplierGroups)) {
        const group = supplierGroups[supplierId];
        const normalizedPhone = normalizePhoneForAuth(group.phone);
        if (!normalizedPhone) continue;

        // Sort orders for tai_rank calculation
        const sortedOrders = [...group.orders].sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return String(a.id).localeCompare(String(b.id));
        });

        // Helper to resolve driver ID
        const resolveDriverId = (order: any): string => {
          const dvDriverId = order.delivery_orders?.[0]?.delivery_vehicles?.[0]?.driver_id;
          if (dvDriverId) return `dvid:${dvDriverId}`;
          if (order.driver_name) return `dn:${normalizePersonName(order.driver_name)}`;
          if (order.received_by) return `rb:${order.received_by}`;
          return 'unknown';
        };

        const driverRankMap = new Map<string, number>();
        let nextRank = 1;

        const summaryItems: any[] = [];

        sortedOrders.forEach((order) => {
          const driverId = resolveDriverId(order);
          if (!driverRankMap.has(driverId)) {
            driverRankMap.set(driverId, nextRank);
            nextRank += 1;
          }
          const taiRank = driverRankMap.get(driverId);

          (order.vegetable_order_items || []).forEach((item: any) => {
            summaryItems.push({
              taiRank,
              quantity: item.quantity || 0,
              productName: item.products?.name || item.package_type || 'Hàng hóa',
              senderName: order.sender_name || '-',
            });
          });
        });

        if (summaryItems.length === 0) continue;

        try {
          const noteBuffer = await DeliveryNoteGenerator.generateSupplierSummaryPng({
            supplierName: group.supplierName,
            date: format(new Date(), 'dd/MM/yyyy'),
            items: summaryItems,
          });

          // Generate public link
          const token = this.generatePublicToken('supplier', group.supplierId, today);
          const publicLink = `${env.CLIENT_URL}/public/summary/supplier/${group.supplierId}/${today}/${token}`;
          const caption = `Phiếu tổng kết hàng đã nhận ngày ${format(new Date(), 'dd/MM/yyyy')}. Cảm ơn vựa.\n\nXem chi tiết tại: ${publicLink}`;

          const result = await this.sendImageMessage({
            recipientPhone: normalizedPhone,
            imageUrls: [],
            attachments: [{
              data: noteBuffer,
              filename: `phieu-tong-vua-${today}-${Date.now()}.png`,
              metadata: { totalSize: noteBuffer.length },
            }],
            caption,
          });

          if (result.success) {
            logger.info(`[ZaloService] Daily supplier summary sent to ${group.supplierName} (${normalizedPhone})`);
          } else {
            logger.error(`[ZaloService] Failed to send supplier summary to ${normalizedPhone}: ${result.error}`);
          }
        } catch (err) {
          logger.error(`[ZaloService] Error processing supplier summary for ${group.supplierName}:`, err);
        }
      }
    } catch (err) {
      logger.error(`[ZaloService] Exception in sendDailySupplierSummaries:`, err);
    }
  }

  async sendDailySenderSummaries(supabaseService: any, logger: any, normalizePhoneForAuth: (phone: string) => string | null): Promise<void> {
    try {
      if (process.env.ZALO_ENABLE_SENDS !== 'true') return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Distributed Lock: Check if already run today to avoid double sending
      const { data: lastRun } = await supabaseService
        .from('general_settings')
        .select('setting_value')
        .eq('setting_key', 'ZALO_LAST_SENDER_SUMMARY_RUN')
        .maybeSingle();

      if (lastRun?.setting_value === today) {
        logger.info(`[ZaloService] Daily sender summary already processed for ${today}, skipping.`);
        return;
      }

      // Mark as run immediately (best-effort lock)
      await supabaseService.from('general_settings').upsert({
        setting_key: 'ZALO_LAST_SENDER_SUMMARY_RUN',
        setting_value: today,
        updated_at: new Date().toISOString(),
      });

      logger.info(`[ZaloService] Starting daily sender summary generation for ${today}`);

      // 1. Fetch all vegetable orders for today to calculate tai_ranks consistently
      const { data: allOrders, error } = await supabaseService
        .from('vegetable_orders')
        .select(`
          *,
          sender_customers:customers!vegetable_orders_sender_id_fkey(id, name, phone),
          customers:customers!vegetable_orders_customer_id_fkey(id, name),
          vegetable_order_items(*, products(*)),
          delivery_orders(*, delivery_vehicles(*, vehicles(license_plate), profiles!driver_id(full_name)))
        `)
        .eq('order_date', today)
        .is('deleted_at', null);

      if (error) throw error;
      if (!allOrders || allOrders.length === 0) {
        logger.info(`[ZaloService] No vegetable orders found for ${today}, skipping sender summary.`);
        return;
      }

      // 2. Pre-calculate tai_ranks per supplier group (matching ImportOrderService logic)
      const ordersBySupplier = new Map<string, any[]>();
      allOrders.forEach((order: any) => {
        const supplierName = order.customers?.name || order.sender_name || '';
        const key = `${supplierName}`;
        if (!ordersBySupplier.has(key)) ordersBySupplier.set(key, []);
        ordersBySupplier.get(key)!.push(order);
      });

      const resolveDriverId = (order: any): string => {
        const dvDriverId = order.delivery_orders?.[0]?.delivery_vehicles?.[0]?.driver_id;
        if (dvDriverId) return `dvid:${dvDriverId}`;
        if (order.driver_name) return `dn:${normalizePersonName(order.driver_name)}`;
        if (order.received_by) return `rb:${order.received_by}`;
        return 'unknown';
      };

      ordersBySupplier.forEach((supplierOrders) => {
        const sorted = [...supplierOrders].sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return String(a.id).localeCompare(String(b.id));
        });

        const driverRankMap = new Map<string, number>();
        let nextRank = 1;

        sorted.forEach((order) => {
          const driverId = resolveDriverId(order);
          if (!driverRankMap.has(driverId)) {
            driverRankMap.set(driverId, nextRank);
            nextRank += 1;
          }
          order.tai_rank = driverRankMap.get(driverId);
        });
      });

      // 3. Group by Sender (sender_id)
      const senderGroups: Record<string, { senderId: string; senderName: string; phone: string; items: any[] }> = {};

      allOrders.forEach((order: any) => {
        const sender = order.sender_customers;
        if (!sender || !sender.id || !sender.phone) return;

        if (!senderGroups[sender.id]) {
          senderGroups[sender.id] = {
            senderId: sender.id,
            senderName: sender.name,
            phone: sender.phone,
            items: [],
          };
        }

        const taiRank = order.tai_rank || 0;
        const depotName = order.customers?.name || 'Vựa';

        (order.vegetable_order_items || []).forEach((item: any) => {
          senderGroups[sender.id].items.push({
            taiRank,
            quantity: item.quantity || 0,
            productName: item.products?.name || item.package_type || 'Hàng hóa',
            depotName,
          });
        });
      });

      // 4. Process each sender group
      for (const senderId of Object.keys(senderGroups)) {
        const group = senderGroups[senderId];
        const normalizedPhone = normalizePhoneForAuth(group.phone);
        if (!normalizedPhone || group.items.length === 0) continue;

        try {
          const noteBuffer = await DeliveryNoteGenerator.generateSenderSummaryPng({
            senderName: group.senderName,
            date: format(new Date(), 'dd/MM/yyyy'),
            items: group.items,
          });

          // Generate public link
          const token = this.generatePublicToken('sender', group.senderId, today);
          const publicLink = `${env.CLIENT_URL}/public/summary/sender/${group.senderId}/${today}/${token}`;
          const caption = `Phiếu tổng kết hàng đã gửi ngày ${format(new Date(), 'dd/MM/yyyy')}. Cảm ơn bạn.\n\nXem chi tiết tại: ${publicLink}`;

          const result = await this.sendImageMessage({
            recipientPhone: normalizedPhone,
            imageUrls: [],
            attachments: [{
              data: noteBuffer,
              filename: `phieu-tong-gui-${today}-${Date.now()}.png`,
              metadata: { totalSize: noteBuffer.length },
            }],
            caption,
          });

          if (result.success) {
            logger.info(`[ZaloService] Daily sender summary sent to ${group.senderName} (${normalizedPhone})`);
          } else {
            logger.error(`[ZaloService] Failed to send sender summary to ${normalizedPhone}: ${result.error}`);
          }
        } catch (err) {
          logger.error(`[ZaloService] Error processing sender summary for ${group.senderName}:`, err);
        }
      }
    } catch (err) {
      logger.error(`[ZaloService] Exception in sendDailySenderSummaries:`, err);
    }
  }
  async getGrocerySummaryData(supabaseService: any, customerId: string, date: string) {
    // 1. Fetch shop name
    const { data: shopNameSetting } = await supabaseService
      .from('general_settings')
      .select('setting_value')
      .eq('setting_key', 'SHOP_NAME')
      .maybeSingle();
    const shopName = shopNameSetting?.setting_value || 'Năm Sự';

    // 2. Fetch assignments and orders
    const [assignmentsRes, ordersRes] = await Promise.all([
      supabaseService
        .from('delivery_vehicles')
        .select(`
          *,
          delivery_orders (
            id, product_name, delivery_date, unit_price, total_quantity, status,
            import_orders (
              customers:customers!import_orders_customer_id_fkey (id, name, phone)
            ),
            vegetable_orders (
              customers:customers!vegetable_orders_customer_id_fkey (id, name, phone)
            )
          ),
          profiles (full_name),
          vehicles (license_plate)
        `)
        .eq('delivery_date', date)
        .or(`delivery_orders.import_orders.customer_id.eq.${customerId},delivery_orders.vegetable_orders.customer_id.eq.${customerId}`),
      supabaseService
        .from('delivery_orders')
        .select(`
          id, product_name, delivery_date, unit_price, total_quantity, status,
          import_orders (
            customers:customers!import_orders_customer_id_fkey (id, name, phone)
          ),
          vegetable_orders (
            customers:customers!vegetable_orders_customer_id_fkey (id, name, phone)
          ),
          delivery_vehicles ( assigned_quantity )
        `)
        .eq('delivery_date', date)
        .or(`import_orders.customer_id.eq.${customerId},vegetable_orders.customer_id.eq.${customerId}`)
        .neq('status', 'hang_o_sg')
    ]);

    const assignments = (assignmentsRes.data || []).filter((dv: any) => {
      const order = dv.delivery_orders;
      const cid = order?.import_orders?.customers?.id || order?.vegetable_orders?.customers?.id;
      return cid === customerId;
    });
    
    const ordersToday = (ordersRes.data || []).filter((order: any) => {
      const cid = order?.import_orders?.customers?.id || order?.vegetable_orders?.customers?.id;
      return cid === customerId;
    });

    if (assignments.length === 0 && ordersToday.length === 0) return null;

    let customerName = 'Khách hàng';
    if (ordersToday.length > 0) {
      const order = ordersToday[0];
      customerName = order.import_orders?.customers?.name || order.vegetable_orders?.customers?.name || 'Khách hàng';
    } else if (assignments.length > 0) {
      const order = assignments[0].delivery_orders;
      customerName = order?.import_orders?.customers?.name || order?.vegetable_orders?.customers?.name || 'Khách hàng';
    }

    const items = assignments.map((dv: any) => ({
      deliveryTime: dv.delivery_time || format(new Date(), 'HH:mm'),
      licensePlate: dv.vehicles?.license_plate || '-',
      staffName: dv.profiles?.full_name || 'NV Giao hàng',
      quantity: dv.assigned_quantity || 0,
      productName: dv.delivery_orders?.product_name || '-',
      price: dv.unit_price || dv.delivery_orders?.unit_price || 0,
      total: dv.expected_amount || 0,
    }));

    let undeliveredQuantity = 0;
    const processedOrderIds = new Set<string>();
    ordersToday.forEach((order: any) => {
      if (processedOrderIds.has(order.id)) return;
      const totalAssigned = (order.delivery_vehicles || []).reduce((sum: number, dv: any) => sum + (dv.assigned_quantity || 0), 0);
      const undelivered = (order.total_quantity || 0) - totalAssigned;
      if (undelivered > 0) {
        undeliveredQuantity += undelivered;
        processedOrderIds.add(order.id);
      }
    });

    return {
      shopName,
      customerName,
      date: format(new Date(date), 'dd/MM/yyyy'),
      items,
      undeliveredQuantity
    };
  }

  async getSupplierSummaryData(supabaseService: any, supplierId: string, date: string) {
    const { data: orders, error } = await supabaseService
      .from('vegetable_orders')
      .select(`
        *,
        customers:customers!vegetable_orders_customer_id_fkey(id, name, phone),
        vegetable_order_items(*, products(*)),
        delivery_orders(*, delivery_vehicles(*, vehicles(license_plate), profiles!driver_id(full_name)))
      `)
      .eq('order_date', date)
      .eq('customer_id', supplierId)
      .is('deleted_at', null);

    if (error || !orders || orders.length === 0) return null;

    const supplierName = orders[0].customers?.name || 'Vựa';

    const sortedOrders = [...orders].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id).localeCompare(String(b.id));
    });

    const resolveDriverId = (order: any): string => {
      const dvDriverId = order.delivery_orders?.[0]?.delivery_vehicles?.[0]?.driver_id;
      if (dvDriverId) return `dvid:${dvDriverId}`;
      if (order.driver_name) return `dn:${normalizePersonName(order.driver_name)}`;
      if (order.received_by) return `rb:${order.received_by}`;
      return 'unknown';
    };

    const driverRankMap = new Map<string, number>();
    let nextRank = 1;
    const items: any[] = [];

    sortedOrders.forEach((order) => {
      const driverId = resolveDriverId(order);
      if (!driverRankMap.has(driverId)) {
        driverRankMap.set(driverId, nextRank);
        nextRank += 1;
      }
      const taiRank = driverRankMap.get(driverId);

      (order.vegetable_order_items || []).forEach((item: any) => {
        items.push({
          taiRank,
          quantity: item.quantity || 0,
          productName: item.products?.name || item.package_type || 'Hàng hóa',
          senderName: order.sender_name || '-',
        });
      });
    });

    return {
      supplierName,
      date: format(new Date(date), 'dd/MM/yyyy'),
      items
    };
  }

  async getSenderSummaryData(supabaseService: any, senderId: string, date: string) {
    const { data: orders, error } = await supabaseService
      .from('vegetable_orders')
      .select(`
        *,
        sender_customers:customers!vegetable_orders_sender_id_fkey(id, name, phone),
        customers:customers!vegetable_orders_customer_id_fkey(id, name),
        vegetable_order_items(*, products(*)),
        delivery_orders(*, delivery_vehicles(*, vehicles(license_plate), profiles!driver_id(full_name)))
      `)
      .eq('order_date', date)
      .eq('sender_id', senderId)
      .is('deleted_at', null);

    if (error || !orders || orders.length === 0) return null;

    const senderName = orders[0].sender_customers?.name || 'Người gửi';

    const sortedOrders = [...orders].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return String(a.id).localeCompare(String(b.id));
    });

    const resolveDriverId = (order: any): string => {
      const dvDriverId = order.delivery_orders?.[0]?.delivery_vehicles?.[0]?.driver_id;
      if (dvDriverId) return `dvid:${dvDriverId}`;
      if (order.driver_name) return `dn:${normalizePersonName(order.driver_name)}`;
      if (order.received_by) return `rb:${order.received_by}`;
      return 'unknown';
    };

    const driverRankMap = new Map<string, number>();
    let nextRank = 1;
    const items: any[] = [];

    sortedOrders.forEach((order) => {
      const driverId = resolveDriverId(order);
      if (!driverRankMap.has(driverId)) {
        driverRankMap.set(driverId, nextRank);
        nextRank += 1;
      }
      const taiRank = driverRankMap.get(driverId);

      (order.vegetable_order_items || []).forEach((item: any) => {
        items.push({
          taiRank,
          quantity: item.quantity || 0,
          productName: item.products?.name || item.package_type || 'Hàng hóa',
          supplierName: order.customers?.name || '-',
        });
      });
    });

    return {
      senderName,
      date: format(new Date(date), 'dd/MM/yyyy'),
      items
    };
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
