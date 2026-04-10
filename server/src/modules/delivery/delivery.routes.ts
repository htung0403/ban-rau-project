import { Router } from 'express';
import { DeliveryController } from './delivery.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', DeliveryController.getAllToday);
router.get('/inventory', DeliveryController.getInventory);
router.post('/', DeliveryController.create);
router.put('/confirm', DeliveryController.confirmOrders);
router.put('/:id/assign-vehicle', DeliveryController.assignVehicle);
router.put('/:id/update-qty', DeliveryController.updateQty);

export default router;
