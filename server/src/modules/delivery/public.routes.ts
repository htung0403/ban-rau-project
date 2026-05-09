import { Router } from 'express';
import { DeliveryService } from './delivery.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

// No auth middleware — this is a public route for customers to view their delivery info.
router.get('/:id', async (req, res) => {
  try {
    const data = await DeliveryService.getPublicById(req.params.id);
    if (!data) {
      return res.status(404).json(errorResponse('Không tìm thấy đơn giao hàng'));
    }
    return res.status(200).json(successResponse(data));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
});

export default router;
