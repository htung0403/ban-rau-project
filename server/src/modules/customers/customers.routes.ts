import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get(
	'/',
	requirePolicy('CUSTOMERS_SHARED_LOOKUP'),
	CustomerController.getAll
);

router.post(
	'/',
	requirePolicy('CUSTOMERS_SHARED_LOOKUP'),
	CustomerController.create
);

router.put(
	'/bulk-loyal',
	requirePolicy('CUSTOMERS_SHARED_LOOKUP'),
	CustomerController.bulkSetLoyal
);

router.put(
	'/:id',
	requirePolicy('CUSTOMERS_SHARED_LOOKUP'),
	CustomerController.update
);

router.delete(
	'/:id',
	requirePolicy('CUSTOMERS_SHARED_LOOKUP'),
	CustomerController.delete
);

router.get(
	'/:id',
	requirePolicy('CUSTOMERS_DIRECTORY_READ'),
	CustomerController.getById
);

router.get('/user/:userId', requirePolicy('PROFILE_VIEW'), CustomerController.getByUserId);
router.get('/:id/orders', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.getOrders);
router.get('/:id/export-orders', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.getExportOrders);
router.get('/:id/delivery-orders', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.getDeliveryOrders);
router.put('/:id/delivery-order-prices', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.updateDeliveryOrderPrices);
router.get('/:id/receipts', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.getReceipts);
router.get('/:id/debt', requirePolicy('ACCOUNTING_DEBT_MANAGE'), CustomerController.getDebt);
router.put('/:id/payment', requirePolicy('ACCOUNTING_DEBT_MANAGE'), CustomerController.updatePayment);
router.post('/create-account', requirePolicy('CUSTOMERS_DIRECTORY_READ'), CustomerController.createAccount);

export default router;
