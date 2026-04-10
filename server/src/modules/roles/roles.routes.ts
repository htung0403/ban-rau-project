import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth';
import { RolesController } from './roles.controller';

const router = Router();

router.use(authMiddleware);

router.get('/permissions', RolesController.getPermissions);
router.get('/', RolesController.getRoles);
router.post('/', RolesController.createRole);
router.put('/:roleId/permissions', RolesController.updateRolePermissions);
router.get('/users/:userId', RolesController.getUserRoles);
router.put('/users/:userId', RolesController.assignUserRoles);

export default router;
