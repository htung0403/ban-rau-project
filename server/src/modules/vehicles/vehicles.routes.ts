import { Router } from 'express';
import { VehicleController } from './vehicles.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', VehicleController.getAll);
router.post('/', requireRole('manager'), VehicleController.create);
router.put('/:id', requireRole('manager'), VehicleController.update);
router.post('/:id/checkin', requireRole('driver'), VehicleController.checkin);
router.get('/:id/checkins', VehicleController.getCheckins);
router.get('/:id/assignments', VehicleController.getAssignments);
router.post('/collect-payment', requireRole('staff', 'manager'), VehicleController.collectPayment);
router.get('/collections', VehicleController.getCollections);

export default router;
