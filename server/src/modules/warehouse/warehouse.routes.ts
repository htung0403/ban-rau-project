import { Router } from 'express';
import { WarehouseController } from './warehouse.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('PRODUCTS_WAREHOUSE_ACCESS'));

router.get('/', WarehouseController.getAll);
router.get('/:id', WarehouseController.getById);
router.get('/:id/inventory', WarehouseController.getInventory);
router.post('/', WarehouseController.create);
router.put('/:id', WarehouseController.update);

export default router;
