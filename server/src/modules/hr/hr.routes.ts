import { Router } from 'express';
import { HRController } from './hr.controller';
import { authMiddleware } from '../../middlewares/auth';

const router = Router();

router.use(authMiddleware);

router.get('/employees', HRController.getEmployees);
router.post('/employees', HRController.createEmployee);
router.get('/employees/:id', HRController.getEmployeeById);
router.put('/employees/:id/status', HRController.updateEmployeeStatus);
router.delete('/employees/:id', HRController.deleteEmployee);

router.get('/leave-requests', HRController.getLeaveRequests);
router.post('/leave-requests', HRController.createLeaveRequest);
router.put('/leave-requests/:id/review', HRController.reviewLeaveRequest);

router.get('/salary-advances', HRController.getSalaryAdvances);
router.post('/salary-advances', HRController.createSalaryAdvance);
router.put('/salary-advances/:id/approve', HRController.approveSalaryAdvance);

router.get('/attendance', HRController.getAttendance);
router.post('/attendance', HRController.markAttendance);

router.get('/compensatory-attendances', HRController.getCompensatoryAttendances);
router.post('/compensatory-attendances', HRController.createCompensatoryAttendance);
router.put('/compensatory-attendances/:id/review', HRController.reviewCompensatoryAttendance);

export default router;
