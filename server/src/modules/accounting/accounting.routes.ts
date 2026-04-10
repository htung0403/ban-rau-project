import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/debts', AccountingController.getDebts);
router.get('/revenue/by-date', AccountingController.getRevenueByDate);
router.get('/revenue/by-vehicle', AccountingController.getRevenueByVehicle);

export default router;
