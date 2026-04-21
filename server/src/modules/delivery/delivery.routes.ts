import { Router } from 'express';
import { DeliveryController } from './delivery.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('PRODUCTS_DELIVERY_ACCESS'));

router.get('/', DeliveryController.getAllToday);
router.get('/inventory', DeliveryController.getInventory);
router.post('/', DeliveryController.create);
router.put('/confirm', DeliveryController.confirmOrders);
router.put('/:id/assign-vehicle', DeliveryController.assignVehicle);
router.put('/:id/update-qty', DeliveryController.updateQty);
router.put('/:id/revert-vehicle', DeliveryController.revertVehicle);
router.put('/:id', DeliveryController.update);
router.post('/delete', DeliveryController.deleteOrders);

export default router;
