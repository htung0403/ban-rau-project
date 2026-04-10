import { Router } from 'express';
import { PriceSettingsController, GeneralSettingsController } from './settings.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/prices', PriceSettingsController.getAll);
router.put('/prices/:key', PriceSettingsController.update);

// Role Salaries
router.get('/roles', PriceSettingsController.getRoleSalaries);
router.post('/roles', PriceSettingsController.upsertRoleSalary);
router.delete('/roles/:key', PriceSettingsController.deleteRoleSalary);

// General Settings
router.get('/general', GeneralSettingsController.getAll);
router.get('/general/:key', GeneralSettingsController.getByKey);
router.put('/general/:key', GeneralSettingsController.upsert);

export default router;
