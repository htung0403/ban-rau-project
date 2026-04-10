import { Router } from 'express';
import { PaymentCollectionsController } from './payment-collections.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

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
