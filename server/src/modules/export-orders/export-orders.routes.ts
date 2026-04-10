import { Router } from 'express';
import { ExportOrderController } from './export-orders.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', ExportOrderController.getAll);
router.post('/', ExportOrderController.create);
router.put('/:id/payment', ExportOrderController.updatePayment);

export default router;
