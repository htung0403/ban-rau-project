import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', PayrollController.getAll);
router.post('/generate', PayrollController.generate);
router.put('/update-statuses', PayrollController.updateStatuses);
router.get('/:id', PayrollController.getById);
router.put('/:id/confirm', PayrollController.confirm);

export default router;
