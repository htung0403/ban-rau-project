import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('manager'), PayrollController.getAll);
router.post('/generate', requireRole('manager'), PayrollController.generate);
router.get('/:id', requireRole('manager'), PayrollController.getById);
router.put('/:id/confirm', requireRole('manager'), PayrollController.confirm);

export default router;
