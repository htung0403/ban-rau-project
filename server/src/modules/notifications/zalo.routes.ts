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

export default router;
