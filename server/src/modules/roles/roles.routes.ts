import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';
import { RolesController } from './roles.controller';

const router = Router();

router.use(authMiddleware);

router.get('/permissions', RolesController.getPermissions);
router.get('/', RolesController.getRoles);
router.post('/', requireRole('admin'), RolesController.createRole);
router.put('/:roleId/permissions', requireRole('admin'), RolesController.updateRolePermissions);
router.get('/users/:userId', RolesController.getUserRoles);
router.put('/users/:userId', requireRole('admin'), RolesController.assignUserRoles);

export default router;
