import { Router } from 'express';
import { HRController } from './hr.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/employees', HRController.getEmployees);
router.get('/employees/:id', HRController.getEmployeeById);

router.get('/leave-requests', HRController.getLeaveRequests);
router.post('/leave-requests', HRController.createLeaveRequest);
router.put('/leave-requests/:id/review', requireRole('manager'), HRController.reviewLeaveRequest);

router.post('/salary-advances', HRController.createSalaryAdvance);
router.put('/salary-advances/:id/approve', requireRole('manager'), HRController.approveSalaryAdvance);

router.get('/attendance', HRController.getAttendance);
router.post('/attendance', requireRole('manager', 'staff', 'driver'), HRController.markAttendance);

export default router;
