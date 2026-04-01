import { Router } from 'express';
import { DeliveryController } from './delivery.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', DeliveryController.getAllToday);
router.get('/inventory', DeliveryController.getInventory);
router.post('/', requireRole('manager', 'staff'), DeliveryController.create);
router.put('/:id/assign-vehicle', requireRole('admin', 'manager', 'staff', 'driver'), DeliveryController.assignVehicle);
router.put('/:id/update-qty', requireRole('admin', 'manager', 'staff', 'driver'), DeliveryController.updateQty);

export default router;
