import { Router } from 'express';
import { zaloService } from './zalo.service';
import { supabaseService } from '../../config/supabase';
import { logger } from '../../utils/logger';

const router = Router();

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
router.get('/status', (req, res) => {
  const status = zaloService.getQRStatus();
  res.json(status);
});

export default router;
