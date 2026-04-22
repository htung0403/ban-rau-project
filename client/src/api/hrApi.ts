import axiosClient from './axiosClient';
import type { User, LeaveRequest, SalaryAdvance, Attendance, CompensatoryAttendance, Expense } from '../types';

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

  createEmployee: async (payload: any) => {
    const { data } = await axiosClient.post<User>('/hr/employees', payload);
    return data;
  },

  updateEmployeeStatus: async (id: string, is_active: boolean) => {
    const { data } = await axiosClient.put<User>(`/hr/employees/${id}/status`, { is_active });
    return data;
  },

  updateEmployee: async (id: string, payload: {
    full_name: string;
    phone?: string | null;
    role: string;
    date_of_birth?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
    citizen_id?: string | null;
    job_title?: string | null;
    department?: string | null;
    personal_email?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    city?: string | null;
    district?: string | null;
    ward?: string | null;
    address_line?: string | null;
    temporary_address?: string | null;
  }) => {
    const { data } = await axiosClient.put<User>(`/hr/employees/${id}`, payload);
    return data;
  },

  deleteEmployee: async (id: string) => {
    const { data } = await axiosClient.delete(`/hr/employees/${id}`);
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
  getSalaryAdvances: async () => {
    const { data } = await axiosClient.get<SalaryAdvance[]>('/hr/salary-advances');
    return data;
  },

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
    note?: string 
  }) => {
    const { data } = await axiosClient.post<Attendance>('/hr/attendance', payload);
    return data;
  },

  // Compensatory Attendance
  getCompensatoryAttendances: async () => {
    const { data } = await axiosClient.get<CompensatoryAttendance[]>('/hr/compensatory-attendances');
    return data;
  },

  createCompensatoryAttendance: async (payload: { 
    work_date: string; 
    check_in_time?: string | null; 
    reason: string;
  }) => {
    const { data } = await axiosClient.post<CompensatoryAttendance>('/hr/compensatory-attendances', payload);
    return data;
  },

  reviewCompensatoryAttendance: async (id: string, status: 'approved' | 'rejected') => {
    const { data } = await axiosClient.put<CompensatoryAttendance>(`/hr/compensatory-attendances/${id}/review`, { status });
    return data;
  },

  // Expenses
  getExpenses: async () => {
    const { data } = await axiosClient.get<Expense[]>('/hr/expenses');
    return data;
  },

  createExpense: async (payload: {
    employee_id: string;
    vehicle_id?: string | null;
    expense_name: string;
    amount: number;
    expense_date: string;
    image_urls?: string[];
    payment_status: 'unpaid' | 'paid';
  }) => {
    const { data } = await axiosClient.post<Expense>('/hr/expenses', payload);
    return data;
  },

  updateExpense: async (id: string, payload: {
    expense_name?: string;
    amount?: number;
    expense_date?: string;
    vehicle_id?: string | null;
    image_urls?: string[];
    payment_status?: 'unpaid' | 'paid';
  }) => {
    const { data } = await axiosClient.put<Expense>(`/hr/expenses/${id}`, payload);
    return data;
  },

  deleteExpense: async (id: string) => {
    const { data } = await axiosClient.delete(`/hr/expenses/${id}`);
    return data;
  },

  confirmExpense: async (id: string) => {
    const { data } = await axiosClient.put<Expense>(`/hr/expenses/${id}/confirm`);
    return data;
  },
};
