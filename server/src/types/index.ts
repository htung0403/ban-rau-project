export type Role = 'admin' | 'manager' | 'staff' | 'driver' | 'customer';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
  full_name: string;
}



export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  code?: string;
}
