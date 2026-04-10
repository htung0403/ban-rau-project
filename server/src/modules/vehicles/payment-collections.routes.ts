import { Router } from 'express';
import { PaymentCollectionsController } from './payment-collections.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('VEHICLES_PAYMENT_COLLECTIONS'));

router.get('/', PaymentCollectionsController.getAll);
router.get('/summary/by-vehicle', PaymentCollectionsController.getSummaryByVehicle);
router.get('/:id', PaymentCollectionsController.getById);

router.post('/', PaymentCollectionsController.create);
router.put('/:id', PaymentCollectionsController.update);
router.post('/:id/submit', PaymentCollectionsController.submit);
router.post('/:id/self-confirm', PaymentCollectionsController.selfConfirm);

router.post('/:id/confirm', PaymentCollectionsController.confirm);
router.post('/:id/revert', PaymentCollectionsController.revert);

export default router;
