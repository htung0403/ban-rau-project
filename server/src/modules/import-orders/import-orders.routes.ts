import { Router } from 'express';
import { ImportOrderController } from './import-orders.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);
router.use(requirePolicy('PRODUCTS_IMPORT_ACCESS'));

router.get('/', ImportOrderController.getAll);
router.get('/daily-sequence', ImportOrderController.getNextSequence);
router.get('/:id', ImportOrderController.getById);
router.post('/', ImportOrderController.create);
router.put('/:id', ImportOrderController.update);
router.delete('/:id', ImportOrderController.delete);

export default router;
