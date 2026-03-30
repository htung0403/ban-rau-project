import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', CustomerController.getAll);
router.post('/', requireRole('manager', 'staff'), CustomerController.create);
router.get('/:id', CustomerController.getById);
router.get('/:id/orders', CustomerController.getOrders);
router.get('/:id/export-orders', CustomerController.getExportOrders);
router.get('/:id/receipts', CustomerController.getReceipts);
router.get('/:id/debt', CustomerController.getDebt);
router.put('/:id/payment', requireRole('manager', 'staff'), CustomerController.updatePayment);
router.post('/create-account', requireRole('manager'), CustomerController.createAccount);

export default router;
