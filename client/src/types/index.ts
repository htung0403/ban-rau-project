// ============================================================
// Types matching server/database/schema.sql
// ============================================================

// --- Auth & Users ---
export type Role = 'admin' | 'manager' | 'staff' | 'driver' | 'customer';

export interface User {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    full_name: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// --- Warehouses ---
export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  capacity?: number;
  current_stock: number;
  manager_id?: string;
  created_at: string;
  // Nested
  profiles?: { full_name: string };
}

// --- Price Settings ---
export interface PriceSetting {
  id: string;
  setting_key: string;
  value: number;
  description?: string;
  updated_by?: string;
  profiles?: { full_name: string };
}

// --- Products ---
export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  category?: string;
  base_price: number;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Customers ---
export interface Customer {
  id: string;
  user_id?: string;
  name: string;
  phone?: string;
  address?: string;
  total_orders: number;
  total_revenue: number;
  debt: number;
  created_at: string;
}

// --- Import Orders ---
export type PackageType = 'thùng' | 'bao' | 'kiện' | 'pallet' | 'khác';
export type OrderStatus = 'pending' | 'processing' | 'delivered' | 'returned';

export interface ImportOrder {
  id: string;
  order_code: string;
  order_date: string;
  order_time: string;
  sender_name: string;
  receiver_name: string;
  receiver_phone?: string;
  receiver_address?: string;
  package_type?: PackageType;
  weight_kg?: number;
  quantity: number;
  unit_price?: number;
  total_amount?: number; // GENERATED ALWAYS AS (quantity * weight_kg * unit_price)
  received_by?: string;
  warehouse_id?: string;
  product_id?: string;
  status: OrderStatus;
  customer_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Nested relations from API
  profiles?: { full_name: string };
  warehouses?: { name: string };
  customers?: { name: string };
  products?: Product;
}

export interface ImportOrderCreatePayload {
  order_date: string;
  order_time: string;
  sender_name: string;
  receiver_name: string;
  receiver_phone?: string;
  receiver_address?: string;
  package_type?: PackageType;
  weight_kg?: number;
  quantity: number;
  unit_price?: number;
  warehouse_id?: string;
  status?: OrderStatus;
  customer_id?: string;
  notes?: string;
}

// --- Export Orders ---
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface ExportOrder {
  id: string;
  export_date: string;
  product_id?: string;
  warehouse_id?: string;
  quantity: number;
  customer_id?: string;
  debt_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  created_by?: string;
  created_at: string;
  // Nested
  customers?: { name: string };
  products?: Product;
  warehouses?: { name: string };
}

// --- Delivery Orders ---
export type DeliveryStatus = 'pending' | 'in_progress' | 'completed';

export interface DeliveryOrder {
  id: string;
  import_order_id?: string;
  product_name: string;
  total_quantity: number;
  delivered_quantity: number;
  remaining_quantity: number; // GENERATED
  unit_price?: number;
  import_cost?: number;
  status: DeliveryStatus;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
  // Nested
  delivery_vehicles?: DeliveryVehicle[];
}

// --- Vehicles ---
export type VehicleStatus = 'available' | 'in_transit' | 'maintenance';

export interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type?: string;
  driver_id?: string;
  status: VehicleStatus;
  created_at: string;
  // Nested
  profiles?: { full_name: string };
}

// --- Delivery Vehicles ---
export type DeliveryVehicleStatus = 'assigned' | 'in_transit' | 'completed';

export interface DeliveryVehicle {
  id: string;
  delivery_order_id: string;
  vehicle_id?: string;
  driver_id?: string;
  assigned_quantity?: number;
  status: DeliveryVehicleStatus;
  assigned_at: string;
  // Nested
  vehicles?: Vehicle;
  profiles?: { full_name: string };
  delivery_orders?: DeliveryOrder & {
    import_orders?: {
      order_code: string;
      receiver_name: string;
      customers?: { name: string };
    };
  };
}

// --- Vehicle Checkins ---
export type CheckinType = 'in' | 'out';

export interface VehicleCheckin {
  id: string;
  vehicle_id?: string;
  driver_id?: string;
  checkin_type: CheckinType;
  latitude?: number;
  longitude?: number;
  address_snapshot?: string;
  checkin_time: string;
}

// --- Payment Collections ---
export interface PaymentCollection {
  id: string;
  vehicle_id?: string;
  driver_id?: string;
  amount: number;
  collected_date: string;
  collected_time: string;
  received_by?: string;
  delivery_order_id?: string;
  notes?: string;
  confirmed_at: string;
}

// --- Receipts ---
export interface Receipt {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Nested relations
  profiles?: { full_name: string };
}

// --- Leave Requests ---
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  from_date: string;
  to_date: string;
  reason?: string;
  status: LeaveStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
  // Nested
  profiles?: { full_name: string };
}

// --- Salary Advances ---
export type AdvanceStatus = 'pending' | 'approved' | 'rejected';

export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  reason: string;
  status: AdvanceStatus;
  approved_by?: string;
  approved_at?: string;
  week_start?: string;
  created_at: string;
  // Nested
  profiles?: { full_name: string };
}

// --- Attendance ---
export interface Attendance {
  id: string;
  employee_id: string;
  work_date: string;
  is_present: boolean;
  note?: string;
}

// --- Payroll ---
export type PayrollStatus = 'draft' | 'confirmed' | 'paid';

export interface Payroll {
  id: string;
  employee_id: string;
  week_start: string;
  week_end: string;
  days_worked: number;
  daily_wage: number;
  gross_salary: number; // GENERATED
  total_advances: number;
  net_salary: number;   // GENERATED
  status: PayrollStatus;
  created_by?: string;
  created_at: string;
  // Nested
  profiles?: { full_name: string };
}

// --- API Response (matching server types) ---
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  code?: string;
}

// --- Filter helpers ---
export interface ImportOrderFilters {
  date?: string;
  status?: OrderStatus;
  sender?: string;
  receiver?: string;
  customer_id?: string;
  search?: string;
}
