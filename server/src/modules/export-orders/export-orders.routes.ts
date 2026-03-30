import { Router } from 'express';
import { ExportOrderController } from './export-orders.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', ExportOrderController.getAll);
router.post('/', requireRole('admin', 'manager', 'staff'), ExportOrderController.create);
router.put('/:id/payment', requireRole('admin', 'manager', 'staff'), ExportOrderController.updatePayment);

export default router;
