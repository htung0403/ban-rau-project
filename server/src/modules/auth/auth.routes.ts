import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);
router.put('/change-password', authMiddleware, AuthController.changePassword);

export default router;
