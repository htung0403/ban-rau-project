import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/debts', requireRole('manager', 'staff'), AccountingController.getDebts);
router.get('/revenue/by-date', requireRole('manager'), AccountingController.getRevenueByDate);
router.get('/revenue/by-vehicle', requireRole('manager'), AccountingController.getRevenueByVehicle);

export default router;
