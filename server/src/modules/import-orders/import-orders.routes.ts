import { Router } from 'express';
import { ImportOrderController } from './import-orders.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', ImportOrderController.getAll);
router.get('/daily-sequence', ImportOrderController.getNextSequence);
router.get('/:id', ImportOrderController.getById);
router.post('/', requireRole('admin', 'manager', 'staff'), ImportOrderController.create);
router.put('/:id', requireRole('admin', 'manager', 'staff'), ImportOrderController.update);
router.delete('/:id', requireRole('admin', 'manager'), ImportOrderController.delete);

export default router;
