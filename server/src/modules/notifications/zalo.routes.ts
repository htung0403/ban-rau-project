import { Router } from 'express';
import { zaloService } from './zalo.service';
import { supabaseService } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { authMiddleware } from '../../middlewares/auth';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();
router.use(authMiddleware);

const normalizePhoneForAuth = (phone: string): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  return `+84${digits}`;
};

const isValidSummaryType = (type: string): type is 'grocery' | 'supplier' | 'sender' => {
  return type === 'grocery' || type === 'supplier' || type === 'sender';
};

const isValidDate = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date);

// GET /api/notifications/zalo/qr
router.get('/qr', async (req, res) => {
  try {
    const qrBase64 = await zaloService.generateLoginQR(supabaseService);
    res.json({ qrBase64 });
  } catch (err) {
    logger.error('[ZaloRoutes] Failed to generate QR:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/notifications/zalo/status
router.get('/status', async (req, res) => {
  const qrState = zaloService.getQRStatus();
  
  // If not in QR flow, check the actual connection status
  if (qrState.status === 'idle' || qrState.status === 'success') {
    const connection = await zaloService.checkConnection();
    res.json({
      ...qrState,
      connected: connection.connected,
      connectionError: connection.error
    });
  } else {
    res.json(qrState);
  }
});

router.get('/summary-status', async (req, res) => {
  try {
    const type = String(req.query.type || '');
    const date = String(req.query.date || '');

    if (!isValidSummaryType(type)) {
      return res.status(400).json(errorResponse('Loại tổng kết không hợp lệ'));
    }
    if (!isValidDate(date)) {
      return res.status(400).json(errorResponse('Ngày không hợp lệ, định dạng đúng: YYYY-MM-DD'));
    }

    const items = await zaloService.getSummaryDispatchStatusList(supabaseService, type, date);
    const summary = {
      total: items.length,
      sent: items.filter((item) => item.status === 'success').length,
      failed: items.filter((item) => item.status === 'failed').length,
      skipped: items.filter((item) => item.status === 'skipped').length,
      pending: items.filter((item) => item.status === 'pending').length,
    };

    return res.json(successResponse({ type, date, summary, items }));
  } catch (err: any) {
    logger.error('[ZaloRoutes] Failed to get summary status list:', err);
    return res.status(500).json(errorResponse(err?.message || 'Lỗi lấy trạng thái tổng kết'));
  }
});

router.post('/send-summary', async (req, res) => {
  try {
    const type = String(req.body?.type || '');
    const targetId = String(req.body?.targetId || '');
    const date = String(req.body?.date || '');

    if (!isValidSummaryType(type)) {
      return res.status(400).json(errorResponse('Loại tổng kết không hợp lệ'));
    }
    if (!targetId) {
      return res.status(400).json(errorResponse('Thiếu targetId'));
    }
    if (!isValidDate(date)) {
      return res.status(400).json(errorResponse('Ngày không hợp lệ, định dạng đúng: YYYY-MM-DD'));
    }

    const result = await zaloService.sendSummaryForTarget(
      supabaseService,
      logger,
      normalizePhoneForAuth,
      {
        type,
        targetId,
        date,
        triggeredBy: 'manual',
      },
    );

    return res.json(successResponse(result));
  } catch (err: any) {
    logger.error('[ZaloRoutes] Failed to send summary:', err);
    return res.status(500).json(errorResponse(err?.message || 'Lỗi gửi tổng kết'));
  }
});

export default router;
