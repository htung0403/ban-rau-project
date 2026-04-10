import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', CustomerController.getAll);
router.post('/', CustomerController.create);
router.get('/:id', CustomerController.getById);
router.get('/user/:userId', CustomerController.getByUserId);
router.get('/:id/orders', CustomerController.getOrders);
router.get('/:id/export-orders', CustomerController.getExportOrders);
router.get('/:id/receipts', CustomerController.getReceipts);
router.get('/:id/debt', CustomerController.getDebt);
router.put('/:id/payment', CustomerController.updatePayment);
router.post('/create-account', CustomerController.createAccount);

export default router;
