import { Router } from 'express';
import { VehicleController } from './vehicles.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', VehicleController.getAll);
router.post('/', VehicleController.create);
router.put('/:id', VehicleController.update);
router.post('/:id/checkin', VehicleController.checkin);
router.get('/:id/checkins', VehicleController.getCheckins);
router.get('/:id/assignments', VehicleController.getAssignments);

export default router;
