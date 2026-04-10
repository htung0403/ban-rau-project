import { Router } from 'express';
import { PriceSettingsController, GeneralSettingsController } from './settings.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/prices', requirePolicy('HR_SALARY_SETTINGS', 'PRODUCTS_SETTINGS'), PriceSettingsController.getAll);
router.put('/prices/:key', requirePolicy('HR_SALARY_SETTINGS', 'PRODUCTS_SETTINGS'), PriceSettingsController.update);

// Role Salaries
router.get('/roles', requirePolicy('HR_SALARY_SETTINGS', 'HR_PAYROLL_VIEW', 'HR_ATTENDANCE_VIEW'), PriceSettingsController.getRoleSalaries);
router.post('/roles', requirePolicy('HR_SALARY_SETTINGS'), PriceSettingsController.upsertRoleSalary);
router.delete('/roles/:key', requirePolicy('HR_SALARY_SETTINGS'), PriceSettingsController.deleteRoleSalary);

// General Settings
router.get('/general', requirePolicy('GENERAL_SETTINGS_VIEW'), GeneralSettingsController.getAll);
router.get('/general/:key', requirePolicy('GENERAL_SETTINGS_VIEW'), GeneralSettingsController.getByKey);
router.put('/general/:key', requirePolicy('GENERAL_SETTINGS_MANAGE'), GeneralSettingsController.upsert);

export default router;
