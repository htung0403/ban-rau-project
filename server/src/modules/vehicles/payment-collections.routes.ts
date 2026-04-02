import { Router } from 'express';
import { PaymentCollectionsController } from './payment-collections.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/', PaymentCollectionsController.getAll);
router.get('/summary/by-vehicle', requireRole('manager'), PaymentCollectionsController.getSummaryByVehicle);
router.get('/:id', PaymentCollectionsController.getById);

router.post('/', requireRole('driver'), PaymentCollectionsController.create);
router.put('/:id', requireRole('driver'), PaymentCollectionsController.update);
router.post('/:id/submit', requireRole('driver'), PaymentCollectionsController.submit);
router.post('/:id/self-confirm', requireRole('driver'), PaymentCollectionsController.selfConfirm);

router.post('/:id/confirm', requireRole('staff', 'manager'), PaymentCollectionsController.confirm);
router.post('/:id/revert', PaymentCollectionsController.revert);

export default router;
