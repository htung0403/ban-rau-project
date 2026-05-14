import { Router } from 'express';
import { zaloService } from './zalo.service';
import { successResponse, errorResponse } from '../../utils/response';
import { supabaseService } from '../../config/supabase';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Public route for fetching daily summary data.
 * GET /api/public/summary/:type/:id/:date/:token
 */
router.get('/:type/:id/:date/:token', async (req, res) => {
  const { type, id, date, token } = req.params;

  try {
    // 1. Verify token
    const isValid = zaloService.verifyPublicToken(type, id, date, token);
    if (!isValid) {
      return res.status(403).json(errorResponse('Mã xác thực không hợp lệ hoặc đã hết hạn'));
    }

    // 2. Fetch data based on type
    let data = null;
    if (type === 'grocery') {
      data = await zaloService.getGrocerySummaryData(supabaseService, id, date);
    } else if (type === 'supplier') {
      data = await zaloService.getSupplierSummaryData(supabaseService, id, date);
    } else if (type === 'sender') {
      data = await zaloService.getSenderSummaryData(supabaseService, id, date);
    } else {
      return res.status(400).json(errorResponse('Loại tổng kết không hợp lệ'));
    }

    if (!data) {
      return res.status(404).json(errorResponse('Không tìm thấy dữ liệu tổng kết cho ngày này'));
    }

    return res.status(200).json(successResponse(data));
  } catch (err: any) {
    logger.error(`[PublicSummary] Error fetching ${type} summary:`, err);
    return res.status(500).json(errorResponse(err.message));
  }
});

export default router;
