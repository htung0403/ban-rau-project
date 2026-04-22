# Plan: Trang Chi phí trong Module Nhân sự

**Feature**: Thêm trang "Chi phí" (`/hanh-chinh-nhan-su/chi-phi`) vào module Hành chính nhân sự  
**Scope**: Migration DB → Backend API → Frontend Page → Wiring (route/menu/permission)  
**Pattern Reference**: `SalaryAdvancesPage.tsx` (frontend), `hr.service.ts:getSalaryAdvances` (backend filter), Migration 62 (image arrays)

---

## Decisions Made

| Câu hỏi | Quyết định |
|---------|-----------|
| Status flow | `unpaid` → `paid` → `confirmed` (map sang existing StatusBadge keys) |
| Biển số xe | Tùy chọn (optional, nullable) |
| Nhân viên sửa/xóa | Được sửa/xóa khi status != `confirmed` |
| Admin tạo thay | Có — form có dropdown chọn nhân viên (admin only) |
| Ngày phát sinh | Có — `expense_date` DatePicker (required) |
| StatusBadge labels | `unpaid` → "Chưa thanh toán", `paid` → "Đã thanh toán", `confirmed` → "Đã xác nhận" |

## Scope

**IN:**
- Migration SQL (table + permissions seed)
- Backend CRUD endpoints (get, create, update, delete, confirm)
- Role-based data filter (staff/driver chỉ thấy của mình)
- Permission wiring (server + client)
- Frontend page (list + dialog form slide-in)
- Multi-image upload (loop uploadApi)
- Mobile card + Desktop table
- Module menu entry

**OUT:**
- Expense categories/tags
- Approval workflow / notifications
- Báo cáo/report chi phí
- Export PDF

---

## File Checklist

| File | Action |
|------|--------|
| `server/database/migrations/63_create_expenses.sql` | CREATE |
| `server/src/config/permission-policies.ts` | EDIT |
| `server/src/modules/hr/hr.routes.ts` | EDIT |
| `server/src/modules/hr/hr.controller.ts` | EDIT |
| `server/src/modules/hr/hr.service.ts` | EDIT |
| `client/src/types/index.ts` | EDIT |
| `client/src/api/hrApi.ts` | EDIT |
| `client/src/hooks/queries/useHR.ts` | EDIT |
| `client/src/pages/hr/ExpensesPage.tsx` | CREATE |
| `client/src/App.tsx` | EDIT |
| `client/src/data/moduleData.ts` | EDIT |
| `client/src/utils/routePermissions.ts` | EDIT |

---

## Phase 1: Database Migration

### Task 1.1 — Tạo file migration `63_create_expenses.sql` [x]

**File**: `D:\job-banrau\server\database\migrations\63_create_expenses.sql`

Nội dung cần viết:

```sql
-- 63_create_expenses.sql
-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  expense_name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0 AND amount <= 999999999),
  expense_date DATE NOT NULL,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'confirmed')),
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering by employee
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON public.expenses(payment_status);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: admin/service role sees all
CREATE POLICY "Service role full access" ON public.expenses
  FOR ALL USING (true) WITH CHECK (true);

-- Seed app_permissions so the permission middleware can resolve the page path
INSERT INTO public.app_permissions (
  permission_key,
  page_path,
  page_name,
  module_key,
  module_name,
  is_active
)
VALUES (
  'chi_phi_view',
  '/hanh-chinh-nhan-su/chi-phi',
  'Chi phí',
  'hanh-chinh-nhan-su',
  'Hành chính nhân sự',
  true
)
ON CONFLICT (page_path) DO NOTHING;
```

**QA**: Chạy `psql -f 63_create_expenses.sql` → phải không có lỗi. Kiểm tra `\d expenses` có đủ các cột.

---

## Phase 2: Backend — Permission Wiring

### Task 2.1 — Thêm policy `HR_EXPENSES` vào `permission-policies.ts` [x]

**File**: `D:\job-banrau\server\src\config\permission-policies.ts`

Tìm dòng `HR_PAYROLL_VIEW: ['/hanh-chinh-nhan-su/luong'],` và thêm SAU nó:

```typescript
  HR_EXPENSES: ['/hanh-chinh-nhan-su/chi-phi'],
```

**QA**: `grep -n "HR_EXPENSES" permission-policies.ts` xuất ra đúng 1 dòng.

---

## Phase 3: Backend — Service

### Task 3.1 — Thêm expense methods vào `HRService` [x]

**File**: `D:\job-banrau\server\src\modules\hr\hr.service.ts`

Thêm vào cuối class `HRService` (trước dấu `}` cuối cùng ở line 355), các static methods sau:

**Method `getExpenses(userId, role)`**:
```typescript
static async getExpenses(userId: string, role: string) {
  let query = supabaseService
    .from('expenses')
    .select(`
      *,
      employee:profiles!expenses_employee_id_fkey(id, full_name),
      vehicle:vehicles!expenses_vehicle_id_fkey(id, license_plate),
      confirmer:profiles!expenses_confirmed_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });

  // Non-admin/manager only see their own records
  if (role !== 'manager' && role !== 'admin') {
    query = query.eq('employee_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

**Method `createExpense(createdBy, payload)`**:
```typescript
static async createExpense(createdBy: string, payload: {
  employee_id: string;
  vehicle_id?: string | null;
  expense_name: string;
  amount: number;
  expense_date: string;
  image_urls?: string[];
  payment_status: 'unpaid' | 'paid';
}) {
  const { data, error } = await supabaseService
    .from('expenses')
    .insert({ ...payload, created_by: createdBy })
    .select(`
      *,
      employee:profiles!expenses_employee_id_fkey(id, full_name),
      vehicle:vehicles!expenses_vehicle_id_fkey(id, license_plate)
    `)
    .single();
  if (error) throw error;
  return data;
}
```

**Method `updateExpense(id, userId, role, payload)`**:
```typescript
static async updateExpense(id: string, userId: string, role: string, payload: {
  expense_name?: string;
  amount?: number;
  expense_date?: string;
  vehicle_id?: string | null;
  image_urls?: string[];
  payment_status?: 'unpaid' | 'paid';
}) {
  // Fetch current record to verify ownership and status
  const { data: existing, error: fetchError } = await supabaseService
    .from('expenses')
    .select('id, employee_id, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Không tìm thấy phiếu chi phí');

  // Prevent editing confirmed records (except admin)
  if (existing.payment_status === 'confirmed' && role !== 'admin') {
    throw new Error('Không thể sửa phiếu đã được xác nhận');
  }

  // Non-admin/manager can only edit their own records
  if (role !== 'admin' && role !== 'manager' && existing.employee_id !== userId) {
    throw new Error('Bạn không có quyền sửa phiếu này');
  }

  const { data, error } = await supabaseService
    .from('expenses')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      *,
      employee:profiles!expenses_employee_id_fkey(id, full_name),
      vehicle:vehicles!expenses_vehicle_id_fkey(id, license_plate)
    `)
    .single();
  if (error) throw error;
  return data;
}
```

**Method `deleteExpense(id, userId, role)`**:
```typescript
static async deleteExpense(id: string, userId: string, role: string) {
  const { data: existing, error: fetchError } = await supabaseService
    .from('expenses')
    .select('id, employee_id, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Không tìm thấy phiếu chi phí');

  // Prevent deleting confirmed records (except admin)
  if (existing.payment_status === 'confirmed' && role !== 'admin') {
    throw new Error('Không thể xóa phiếu đã được xác nhận');
  }

  // Non-admin/manager can only delete their own records
  if (role !== 'admin' && role !== 'manager' && existing.employee_id !== userId) {
    throw new Error('Bạn không có quyền xóa phiếu này');
  }

  const { error } = await supabaseService
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { success: true };
}
```

**Method `confirmExpense(id, adminId)`** — Admin only:
```typescript
static async confirmExpense(id: string, adminId: string) {
  const { data, error } = await supabaseService
    .from('expenses')
    .update({
      payment_status: 'confirmed',
      confirmed_by: adminId,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      employee:profiles!expenses_employee_id_fkey(id, full_name),
      vehicle:vehicles!expenses_vehicle_id_fkey(id, license_plate),
      confirmer:profiles!expenses_confirmed_by_fkey(id, full_name)
    `)
    .single();
  if (error) throw error;
  return data;
}
```

**QA**: Không có TypeScript errors sau khi thêm (chạy `tsc --noEmit`).

---

## Phase 4: Backend — Controller

### Task 4.1 — Thêm expense controller methods vào `HRController` [x]

**File**: `D:\job-banrau\server\src\modules\hr\hr.controller.ts`

Đọc file để xác định Zod schema patterns và `successResponse`/`errorResponse` utils. Thêm vào cuối class `HRController`:

**Zod schemas** (thêm cùng chỗ với các schema khác trong file, sau import Zod):
```typescript
const createExpenseSchema = z.object({
  employee_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable().optional(),
  expense_name: z.string().min(1, 'Tên chi phí không được để trống').max(255),
  amount: z.number().min(0).max(999999999),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không đúng định dạng YYYY-MM-DD'),
  image_urls: z.array(z.string().url()).optional().default([]),
  payment_status: z.enum(['unpaid', 'paid']),
});

const updateExpenseSchema = z.object({
  expense_name: z.string().min(1).max(255).optional(),
  amount: z.number().min(0).max(999999999).optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  image_urls: z.array(z.string().url()).optional(),
  payment_status: z.enum(['unpaid', 'paid']).optional(),
});
```

**Controller methods**:

```typescript
static async getExpenses(req: Request, res: Response) {
  try {
    const data = await HRService.getExpenses(req.user!.id, req.user!.role);
    return res.json(successResponse(data));
  } catch (err: any) {
    return res.status(500).json(errorResponse(err.message));
  }
}

static async createExpense(req: Request, res: Response) {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.errors[0].message));
    }
    // Non-admin can only create for themselves
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      parsed.data.employee_id = req.user!.id;
    }
    const data = await HRService.createExpense(req.user!.id, parsed.data);
    return res.status(201).json(successResponse(data, 'Tạo phiếu chi phí thành công'));
  } catch (err: any) {
    return res.status(500).json(errorResponse(err.message));
  }
}

static async updateExpense(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.errors[0].message));
    }
    const data = await HRService.updateExpense(id, req.user!.id, req.user!.role, parsed.data);
    return res.json(successResponse(data, 'Cập nhật phiếu chi phí thành công'));
  } catch (err: any) {
    const status = err.message.includes('quyền') || err.message.includes('xác nhận') ? 403 : 500;
    return res.status(status).json(errorResponse(err.message));
  }
}

static async deleteExpense(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await HRService.deleteExpense(id, req.user!.id, req.user!.role);
    return res.json(successResponse(null, 'Đã xóa phiếu chi phí'));
  } catch (err: any) {
    const status = err.message.includes('quyền') || err.message.includes('xác nhận') ? 403 : 500;
    return res.status(status).json(errorResponse(err.message));
  }
}

static async confirmExpense(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await HRService.confirmExpense(id, req.user!.id);
    return res.json(successResponse(data, 'Đã xác nhận đưa tiền thành công'));
  } catch (err: any) {
    return res.status(500).json(errorResponse(err.message));
  }
}
```

**QA**: Sau khi edit, `tsc --noEmit` không có error mới.

---

## Phase 5: Backend — Routes

### Task 5.1 — Thêm expense routes vào `hr.routes.ts` [x]

**File**: `D:\job-banrau\server\src\modules\hr\hr.routes.ts`

Thêm SAU dòng `router.put('/compensatory-attendances/:id/review', ...)` (line 30), TRƯỚC `export default router;`:

```typescript
// Expenses
router.get('/expenses', requirePolicy('HR_EXPENSES'), HRController.getExpenses);
router.post('/expenses', requirePolicy('HR_EXPENSES'), HRController.createExpense);
router.put('/expenses/:id', requirePolicy('HR_EXPENSES'), HRController.updateExpense);
router.delete('/expenses/:id', requirePolicy('HR_EXPENSES'), HRController.deleteExpense);
router.put('/expenses/:id/confirm', requirePolicy('HR_APPROVALS'), HRController.confirmExpense);
```

**Lưu ý**: `confirm` dùng `HR_APPROVALS` (chỉ admin/manager có), còn GET/POST/PUT/DELETE dùng `HR_EXPENSES` (nhân viên thường cũng có).

**QA**: `GET /api/hr/expenses` với token staff → 200. Với token driver → 200. `PUT /api/hr/expenses/:id/confirm` với token staff → 403.

---

## Phase 6: Client — Types

### Task 6.1 — Thêm `Expense` type vào `client/src/types/index.ts` [x]

**File**: `D:\job-banrau\client\src\types\index.ts`

Tìm section `// --- Customers ---` và thêm TRƯỚC nó:

```typescript
// --- Expenses ---
export type ExpensePaymentStatus = 'unpaid' | 'paid' | 'confirmed';

export interface Expense {
  id: string;
  employee_id: string;
  vehicle_id?: string | null;
  expense_name: string;
  amount: number;
  expense_date: string;
  image_urls: string[];
  payment_status: ExpensePaymentStatus;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Nested relations from API
  employee?: { id: string; full_name: string };
  vehicle?: { id: string; license_plate: string } | null;
  confirmer?: { id: string; full_name: string } | null;
}
```

**QA**: `tsc --noEmit` từ `client/` không có error mới.

---

## Phase 7: Client — API

### Task 7.1 — Thêm expense endpoints vào `hrApi.ts` [x]

**File**: `D:\job-banrau\client\src\api\hrApi.ts`

Thêm import `Expense` vào dòng import types hiện có:
```typescript
import type { User, LeaveRequest, SalaryAdvance, Attendance, CompensatoryAttendance, Expense } from '../types';
```

Thêm vào cuối object `hrApi` (trước dấu `}`):

```typescript
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
```

**QA**: `tsc --noEmit` từ client/ không có error mới.

---

## Phase 8: Client — Hooks

### Task 8.1 — Thêm expense hooks vào `useHR.ts` [x]

**File**: `D:\job-banrau\client\src\hooks\queries\useHR.ts`

Thêm `expenses` vào `hrKeys` object (sau line `compensatoryAttendances`):
```typescript
  expenses: () => [...hrKeys.all, 'expenses'] as const,
```

Thêm vào cuối file (sau `useReviewCompensatoryAttendance`):

```typescript
// ─── Expenses ─────────────────────────────────────────────────────────────
export function useExpenses() {
  return useQuery({
    queryKey: hrKeys.expenses(),
    queryFn: () => hrApi.getExpenses(),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      toast.success('Tạo phiếu chi phí thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi tạo phiếu chi phí'),
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof hrApi.updateExpense>[1] }) =>
      hrApi.updateExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      toast.success('Cập nhật phiếu chi phí thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi cập nhật phiếu chi phí'),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      toast.success('Đã xóa phiếu chi phí');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi xóa phiếu chi phí'),
  });
}

export function useConfirmExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hrApi.confirmExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrKeys.expenses() });
      toast.success('Đã xác nhận đưa tiền thành công');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Lỗi khi xác nhận'),
  });
}
```

**QA**: `tsc --noEmit` từ client/ không có error mới.

---

## Phase 9: Client — ExpensesPage

### Task 9.1 — Tạo `ExpensesPage.tsx` [x]

**File**: `D:\job-banrau\client\src\pages\hr\ExpensesPage.tsx`

**Cấu trúc tổng quan** (follow pattern `SalaryAdvancesPage.tsx`):

```
ExpensesPage
├── PageHeader (desktop only): title="Chi phí", backPath="/hanh-chinh-nhan-su"
│   └── actions: Button "Tạo phiếu chi phí" (opens dialog)
├── DraggableFAB (mobile): opens dialog
├── Main content card
│   ├── Loading → LoadingSkeleton
│   ├── Error → ErrorState
│   ├── Empty → EmptyState
│   └── Data →
│       ├── Desktop: <table> (hidden md:table)
│       │   ├── thead: Tên NV | Tên chi phí | Xe | Ngày | Số tiền | Trạng thái | Thao tác
│       │   └── tbody: ExpenseRow per item
│       └── Mobile: div.md:hidden card list
│           └── ExpenseCard per item
└── Dialog (createPortal) — slide-in từ phải
    ├── Header: Receipt icon + "Tạo phiếu chi phí" / "Chỉnh sửa phiếu"
    ├── Form body (scrollable):
    │   ├── Section "Thông tin nhân viên"
    │   │   ├── Tên nhân viên: read-only text (auto từ user.full_name) cho non-admin
    │   │   └── Tên nhân viên: <select> employees dropdown CHO ADMIN/MANAGER
    │   ├── Section "Thông tin chi phí"
    │   │   ├── Tên chi phí: <input type="text"> (required)
    │   │   ├── Ngày phát sinh: <DatePicker> (required, default=today)
    │   │   ├── Biển số xe: <select> vehicles dropdown (optional, "-- Không có xe --")
    │   │   ├── Số tiền: <CurrencyInput> (required, ₫ prefix)
    │   │   └── Trạng thái thanh toán: 2 toggle buttons
    │   │       ├── "Chưa thanh toán" → payment_status='unpaid'
    │   │       └── "Đã thanh toán" → payment_status='paid'
    │   └── Section "Hình ảnh chứng từ"
    │       ├── Upload zone: input[type=file multiple accept="image/*"]
    │       ├── Preview grid: thumbnails 2x2 với nút X xóa
    │       └── Max 10 ảnh (validate trước khi upload)
    └── Footer:
        ├── Button "Hủy" (closes dialog)
        └── Button "Lưu phiếu" / "Đang lưu..." (isPending)
```

**Chi tiết state management trong dialog**:
```typescript
const [formData, setFormData] = useState({
  employee_id: user?.id || '',          // auto-fill, admin có thể override
  vehicle_id: '' as string | null,
  expense_name: '',
  amount: undefined as number | undefined,
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  payment_status: 'unpaid' as 'unpaid' | 'paid',
  image_urls: [] as string[],
});
const [localImageFiles, setLocalImageFiles] = useState<File[]>([]);  // preview files
const [uploadingImages, setUploadingImages] = useState(false);
const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
```

**Upload flow** (khi submit form):
```typescript
// 1. Upload tất cả file trước
setUploadingImages(true);
const uploadedUrls: string[] = [...formData.image_urls]; // giữ URLs cũ nếu edit
for (const file of localImageFiles) {
  const result = await uploadApi.uploadFile(file, 'expenses', 'receipts');
  uploadedUrls.push(result.url);
}
setUploadingImages(false);

// 2. Submit form với URLs đã upload
createMutation.mutate({ ...formData, image_urls: uploadedUrls }, { onSuccess: closeDialog });
```

**Admin actions trong table row**:
- Nút ✏️ Edit: mở dialog điền sẵn data (setEditingExpense)
- Nút 🗑️ Delete: confirm dialog → `deleteExpense(id)` — chỉ hiện khi `payment_status !== 'confirmed'`
- Nút ✅ "Xác nhận đã đưa tiền": `confirmExpense(id)` — chỉ hiện khi admin/manager và `payment_status === 'paid'`

**Non-admin row actions**:
- Nút ✏️ Edit: chỉ hiện khi `expense.employee_id === user.id && payment_status !== 'confirmed'`
- Nút 🗑️ Delete: chỉ hiện khi `expense.employee_id === user.id && payment_status !== 'confirmed'`

**StatusBadge mapping**:
```typescript
const statusColors: Record<string, 'pending' | 'success' | 'error' | 'default' | 'warning'> = {
  unpaid: 'error',       // đỏ
  paid: 'success',       // xanh
  confirmed: 'pending',  // xanh dương
};
const statusLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  confirmed: 'Đã xác nhận',
};
```

**formatCurrency** (copy từ SalaryAdvancesPage):
```typescript
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
```

**Imports cần thiết**:
```typescript
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Plus, Receipt, X, ChevronRight, Pencil, Trash2, CheckCircle, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import StatusBadge from '../../components/shared/StatusBadge';
import DraggableFAB from '../../components/shared/DraggableFAB';
import CurrencyInput from '../../components/shared/CurrencyInput';
import { useAuth } from '../../context/AuthContext';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useConfirmExpense } from '../../hooks/queries/useHR';
import { useVehicles } from '../../hooks/queries/useVehicles';
import { useEmployees } from '../../hooks/queries/useHR';
import { uploadApi } from '../../api/uploadApi';
import type { Expense } from '../../types';
```

**QA**:
- `tsc --noEmit` không có error
- Trang render ở `/hanh-chinh-nhan-su/chi-phi` với role staff → không 403
- Form dialog mở được, submit tạo record mới, dialog đóng, list refresh
- Mobile view (< md) hiển thị card layout
- Desktop view (>= md) hiển thị table

---

## Phase 10: Client — Route Registration

### Task 10.1 — Thêm route vào `App.tsx` [x]

**File**: `D:\job-banrau\client\src\App.tsx`

Thêm import:
```typescript
import ExpensesPage from './pages/hr/ExpensesPage';
```

Thêm Route SAU line 122 (`/hanh-chinh-nhan-su/phan-quyen`):
```tsx
<Route path="/hanh-chinh-nhan-su/chi-phi" element={<ExpensesPage />} />
```

**QA**: Navigate to `/hanh-chinh-nhan-su/chi-phi` → ExpensesPage renders (not 404).

---

## Phase 11: Client — Module Menu

### Task 11.1 — Thêm menu item vào `moduleData.ts` [x]

**File**: `D:\job-banrau\client\src\data\moduleData.ts`

Đọc file để xác định imports hiện có (Receipt icon có thể cần import thêm). Thêm vào section "Tiền lương" (lines 69-75), SAU item "Ứng lương" (line 73):

```typescript
{ icon: Receipt, title: 'Chi phí', description: 'Quản lý phiếu chi phí, thanh toán của nhân viên.', colorScheme: 'amber', path: '/hanh-chinh-nhan-su/chi-phi' },
```

Nếu `Receipt` chưa được import từ `lucide-react`, thêm vào import statement.

**QA**: Mở `/hanh-chinh-nhan-su` module page → thấy card "Chi phí" trong section "Tiền lương".

---

## Phase 12: Client — Route Permissions (Legacy Client Gate)

### Task 12.1 — Thêm path vào `routePermissions.ts` [x]

**File**: `D:\job-banrau\client\src\utils\routePermissions.ts`

Đọc file trước. Tìm `DRIVER_LIKE_LEGACY_PATHS` array và thêm `/hanh-chinh-nhan-su/chi-phi` vào.  
Tìm `LEGACY_ALLOWED_PATHS_BY_ROLE.staff` (hoặc tương đương) và thêm path.

**Pattern cần follow**: Cùng cách các path HR khác được thêm vào (ví dụ `/hanh-chinh-nhan-su/ung-luong`).

**QA**: 
- Role `driver` navigate to `/hanh-chinh-nhan-su/chi-phi` → page renders (không redirect về `/`)
- Role `staff` navigate to `/hanh-chinh-nhan-su/chi-phi` → page renders

---

## Final Verification Wave

> **STOP**: Không đánh dấu hoàn thành cho đến khi người dùng xác nhận tất cả check bên dưới.

### Backend verification:
- [ ] `tsc --noEmit` từ `server/` → 0 errors
- [ ] Migration 63 chạy OK: `psql -f 63_create_expenses.sql` → no ERROR
- [ ] `GET /api/hr/expenses` với admin token → `{ success: true, data: [] }` (200)
- [ ] `POST /api/hr/expenses` với valid body → `{ success: true, data: { id: "..." } }` (201)
- [ ] `GET /api/hr/expenses` với staff token → chỉ trả records của staff đó
- [ ] `GET /api/hr/expenses` với admin token → trả ALL records
- [ ] `PUT /api/hr/expenses/:id/confirm` với staff token → 403
- [ ] `PUT /api/hr/expenses/:id/confirm` với admin token → 200, `payment_status = 'confirmed'`
- [ ] `DELETE /api/hr/expenses/:id` với staff trên expense của người khác → 403
- [ ] `DELETE /api/hr/expenses/:id` trên expense `confirmed` với non-admin → 403

### Frontend verification:
- [ ] `tsc --noEmit` từ `client/` → 0 errors
- [ ] Navigate `/hanh-chinh-nhan-su/chi-phi` với role `staff` → page renders, không redirect
- [ ] Navigate `/hanh-chinh-nhan-su/chi-phi` với role `driver` → page renders, không redirect
- [ ] Module page `/hanh-chinh-nhan-su` → card "Chi phí" hiển thị
- [ ] FAB/Button → dialog mở với form đủ fields
- [ ] Tên nhân viên auto-fill đúng từ `user.full_name` cho non-admin
- [ ] Tên nhân viên là dropdown có thể chọn cho admin
- [ ] Dropdown biển số xe load từ `useVehicles()`, có option "-- Không có xe --"
- [ ] Upload ảnh: chọn multiple images → preview thumbnails → submit → URLs lưu đúng
- [ ] Form submit → record tạo → dialog đóng → list refresh
- [ ] Status badges hiển thị đúng màu: đỏ (unpaid), xanh (paid), xanh dương (confirmed)
- [ ] Admin/manager thấy nút Edit, Delete, "Xác nhận đã đưa tiền" (khi status=paid)
- [ ] Staff chỉ thấy Edit/Delete trên records của chính mình, khi status != confirmed
- [ ] Responsive: mobile card view, desktop table view
