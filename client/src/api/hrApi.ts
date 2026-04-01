import axiosClient from './axiosClient';
import type { User, LeaveRequest, SalaryAdvance, Attendance } from '../types';

export const hrApi = {
  // Employees
  getEmployees: async () => {
    const { data } = await axiosClient.get<User[]>('/hr/employees');
    return data;
  },

  getEmployeeById: async (id: string) => {
    const { data } = await axiosClient.get<User>(`/hr/employees/${id}`);
    return data;
  },

  // Leave Requests
  getLeaveRequests: async (employeeId?: string) => {
    const { data } = await axiosClient.get<LeaveRequest[]>('/hr/leave-requests', { params: employeeId ? { employee_id: employeeId } : undefined });
    return data;
  },

  createLeaveRequest: async (payload: { from_date: string; to_date: string; reason?: string }) => {
    const { data } = await axiosClient.post<LeaveRequest>('/hr/leave-requests', payload);
    return data;
  },

  reviewLeaveRequest: async (id: string, payload: { status: 'approved' | 'rejected'; review_note?: string }) => {
    const { data } = await axiosClient.put<LeaveRequest>(`/hr/leave-requests/${id}/review`, payload);
    return data;
  },

  // Salary Advances
  createSalaryAdvance: async (payload: { amount: number; reason: string; week_start?: string }) => {
    const { data } = await axiosClient.post<SalaryAdvance>('/hr/salary-advances', payload);
    return data;
  },

  approveSalaryAdvance: async (id: string) => {
    const { data } = await axiosClient.put<SalaryAdvance>(`/hr/salary-advances/${id}/approve`);
    return data;
  },

  // Attendance
  getAttendanceByDate: async (date: string, startDate?: string, endDate?: string) => {
    const { data } = await axiosClient.get<Attendance[]>('/hr/attendance', { 
      params: { 
        date, 
        startDate, 
        endDate 
      } 
    });
    return data;
  },

  markAttendance: async (payload: { 
    employee_id: string; 
    work_date: string; 
    is_present?: boolean; 
    check_in_time?: string | null; 
    check_out_time?: string | null; 
    note?: string 
  }) => {
    const { data } = await axiosClient.post<Attendance>('/hr/attendance', payload);
    return data;
  },
};
