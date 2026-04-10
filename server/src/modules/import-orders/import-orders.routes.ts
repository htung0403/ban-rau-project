import { Router } from 'express';
import { ImportOrderController } from './import-orders.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', ImportOrderController.getAll);
router.get('/daily-sequence', ImportOrderController.getNextSequence);
router.get('/:id', ImportOrderController.getById);
router.post('/', ImportOrderController.create);
router.put('/:id', ImportOrderController.update);
router.delete('/:id', ImportOrderController.delete);

export default router;
