import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('ACCOUNTING_REPORTS_VIEW'));

router.get('/debts', AccountingController.getDebts);
router.get('/revenue/by-date', AccountingController.getRevenueByDate);
router.get('/revenue/by-vehicle', AccountingController.getRevenueByVehicle);

export default router;
