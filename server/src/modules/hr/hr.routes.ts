import { Router } from 'express';
import { HRController } from './hr.controller';
import { authMiddleware } from '../../middlewares/auth';
import { requirePolicy } from '../../middlewares/role';

const router = Router();

router.use(authMiddleware);

router.get('/employees', requirePolicy('HR_EMPLOYEES_VIEW'), HRController.getEmployees);
router.post('/employees', requirePolicy('HR_EMPLOYEES_MANAGE'), HRController.createEmployee);
router.get('/employees/:id', requirePolicy('HR_EMPLOYEES_VIEW'), HRController.getEmployeeById);
router.put('/employees/:id', requirePolicy('HR_EMPLOYEES_MANAGE'), HRController.updateEmployee);
router.put('/employees/:id/status', requirePolicy('HR_EMPLOYEES_MANAGE'), HRController.updateEmployeeStatus);
router.delete('/employees/:id', requirePolicy('HR_EMPLOYEES_MANAGE'), HRController.deleteEmployee);

router.get('/leave-requests', requirePolicy('HR_LEAVE_REQUESTS'), HRController.getLeaveRequests);
router.post('/leave-requests', requirePolicy('HR_LEAVE_REQUESTS'), HRController.createLeaveRequest);
router.put('/leave-requests/:id/review', requirePolicy('HR_APPROVALS', 'HR_LEAVE_REQUESTS'), HRController.reviewLeaveRequest);

router.get('/salary-advances', requirePolicy('HR_SALARY_ADVANCE'), HRController.getSalaryAdvances);
router.post('/salary-advances', requirePolicy('HR_SALARY_ADVANCE'), HRController.createSalaryAdvance);
router.put('/salary-advances/:id/approve', requirePolicy('HR_APPROVALS'), HRController.approveSalaryAdvance);

router.get('/attendance', requirePolicy('HR_ATTENDANCE_VIEW'), HRController.getAttendance);
router.post('/attendance', requirePolicy('HR_ATTENDANCE_VIEW'), HRController.markAttendance);

router.get('/compensatory-attendances', requirePolicy('HR_ATTENDANCE_VIEW', 'HR_APPROVALS'), HRController.getCompensatoryAttendances);
router.post('/compensatory-attendances', requirePolicy('HR_ATTENDANCE_VIEW', 'HR_APPROVALS'), HRController.createCompensatoryAttendance);
router.put('/compensatory-attendances/:id/review', requirePolicy('HR_APPROVALS'), HRController.reviewCompensatoryAttendance);

export default router;
