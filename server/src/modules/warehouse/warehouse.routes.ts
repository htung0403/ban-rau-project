import { Router } from 'express';
import { WarehouseController } from './warehouse.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', WarehouseController.getAll);
router.get('/:id', WarehouseController.getById);
router.get('/:id/inventory', WarehouseController.getInventory);
router.post('/', requireRole('admin'), WarehouseController.create);
router.put('/:id', requireRole('admin'), WarehouseController.update);

export default router;
