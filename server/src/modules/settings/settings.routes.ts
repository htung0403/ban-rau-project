import { Router } from 'express';
import { PriceSettingsController } from './settings.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/prices', PriceSettingsController.getAll);
router.put('/prices/:key', requireRole('manager'), PriceSettingsController.update);

export default router;
