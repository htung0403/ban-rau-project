import { Router } from 'express';
import { HRController } from './hr.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/employees', HRController.getEmployees);
router.post('/employees', requireRole('admin', 'manager'), HRController.createEmployee);
router.get('/employees/:id', HRController.getEmployeeById);
router.put('/employees/:id/status', requireRole('admin', 'manager'), HRController.updateEmployeeStatus);

router.get('/leave-requests', HRController.getLeaveRequests);
router.post('/leave-requests', HRController.createLeaveRequest);
router.put('/leave-requests/:id/review', HRController.reviewLeaveRequest);

router.get('/salary-advances', HRController.getSalaryAdvances);
router.post('/salary-advances', HRController.createSalaryAdvance);
router.put('/salary-advances/:id/approve', requireRole('manager', 'admin'), HRController.approveSalaryAdvance);

router.get('/attendance', HRController.getAttendance);
router.post('/attendance', requireRole('manager', 'admin', 'staff', 'driver'), HRController.markAttendance);

router.get('/compensatory-attendances', requireRole('manager', 'admin'), HRController.getCompensatoryAttendances);
router.post('/compensatory-attendances', requireRole('manager', 'admin', 'staff', 'driver'), HRController.createCompensatoryAttendance);
router.put('/compensatory-attendances/:id/review', requireRole('manager', 'admin'), HRController.reviewCompensatoryAttendance);

export default router;
