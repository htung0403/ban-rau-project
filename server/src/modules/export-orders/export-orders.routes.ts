import { Router } from 'express';
import { ExportOrderController } from './export-orders.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('PRODUCTS_EXPORT_ACCESS'));

router.get('/', ExportOrderController.getAll);
router.post('/', ExportOrderController.create);
router.put('/:id/payment', ExportOrderController.updatePayment);

export default router;
