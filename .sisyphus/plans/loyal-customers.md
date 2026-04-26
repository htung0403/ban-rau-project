# Plan: Khách hàng thân thiết (Loyal Customers)

## Overview
Implement "Khách hàng thân thiết" feature — a loyalty flag on grocery customers that enables Admin to set unit prices on their delivery orders and print invoices.

## Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage model | `is_loyal BOOLEAN` column on `customers` table | Orthogonal to `customer_type` — preserves sender/receiver distinction |
| Navigation | Only `/khach-hang` module | User preference; detail page stays at `/ke-toan/khach-hang/:id` (consistent with all customer pages) |
| Data source for orders | `delivery_orders` via `import_orders.customer_id` | Only grocery (standard) delivery orders, not vegetable |
| Multiple drivers display | All names comma-separated | Admin needs full visibility |
| Checkbox confirm meaning | Persisted — confirms unit_price is correct + saves to DB | Combined confirm + select-for-print |
| Unit price editing | Always editable, can overwrite existing values | Admin has full authority |
| Print approach | `window.print()` + `@media print` CSS | Simple, no backend needed |
| Checkbox on which page | Only `grocery_sender` page | Only senders need loyalty pricing |

## Scope
**IN:**
- DB: Add `is_loyal` column + `price_confirmed` column on `delivery_orders`
- Backend: Bulk-loyal endpoint, delivery-orders-by-customer endpoint, unit-price-update endpoint
- Frontend: Checkbox on GroceryCustomersPage (grocery_sender only), LoyalCustomersPage, Orders tab on CustomerDetailPage
- Print: Browser print for confirmed order rows

**OUT:**
- PDF export / server-side print
- Excel download
- Pagination on orders tab
- Changes to /ke-toan module navigation
- Separate detail page for loyal customers
- Checkboxes on mobile view
- Making columns other than unit_price editable

## Key Files Map
| Purpose | File |
|---------|------|
| DB schema | `server/database/schema.sql` |
| Customer Zod schemas | `server/src/modules/customers/customers.controller.ts` |
| Customer service | `server/src/modules/customers/customers.service.ts` |
| Customer routes | `server/src/modules/customers/customers.routes.ts` |
| Frontend Customer type | `client/src/types/index.ts:159-171` |
| Customer API client | `client/src/api/customersApi.ts` |
| Customer React Query hooks | `client/src/hooks/queries/useCustomers.ts` |
| Grocery customers page | `client/src/pages/customers/GroceryCustomersPage.tsx` |
| Customer detail page | `client/src/pages/customers/CustomerDetailPage.tsx` |
| App routes | `client/src/App.tsx:132-153` |
| Module navigation cards | `client/src/data/moduleData.ts:58-73` |
| Delivery service (reference) | `server/src/modules/delivery/delivery.service.ts` |

## Implementation Tasks

### Task 1: Database Migration — Add `is_loyal` column + `price_confirmed` column - [x]
**Files to modify:**
- `server/database/schema.sql` (documentation only — add comments showing new columns)

**Actions:**
1. Run the following SQL against Supabase (via Supabase Dashboard SQL Editor or a migration script):
```sql
-- Add is_loyal flag to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_loyal BOOLEAN DEFAULT FALSE;

-- Add price_confirmed flag to delivery_orders (tracks admin confirmation per row)
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS price_confirmed BOOLEAN DEFAULT FALSE;
```
2. Update `server/database/schema.sql` to document the new columns:
   - In the `customers` table definition (around line 62), add comment: `is_loyal BOOLEAN DEFAULT FALSE,`
   - In the `delivery_orders` table definition (around line 190), add comment: `price_confirmed BOOLEAN DEFAULT FALSE,`

**QA:**
- Verify columns exist: `SELECT is_loyal FROM customers LIMIT 1;` returns `false`
- Verify: `SELECT price_confirmed FROM delivery_orders LIMIT 1;` returns `false`

---

### Task 2: Backend — Update Zod schemas + CustomerService - [x]
**Files to modify:**
- `server/src/modules/customers/customers.controller.ts`
- `server/src/modules/customers/customers.service.ts`

**Actions in `customers.controller.ts`:**
1. Add `is_loyal` to `updateCustomerSchema` (line 14-19):
```typescript
const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  customer_type: z.enum([...]).optional(),
  is_loyal: z.boolean().optional(), // ADD THIS
});
```

2. Add new Zod schema for bulk loyal update:
```typescript
const bulkLoyalSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Cần ít nhất 1 khách hàng'),
});
```

3. Add new controller method `bulkSetLoyal`:
```typescript
static async bulkSetLoyal(req: Request, res: Response) {
  try {
    const validated = bulkLoyalSchema.parse(req.body);
    const data = await CustomerService.bulkSetLoyal(validated.ids);
    return res.status(200).json(successResponse(data, 'Customers updated to loyal'));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
}
```

4. Add new controller method `getDeliveryOrders`:
```typescript
static async getDeliveryOrders(req: Request, res: Response) {
  try {
    const data = await CustomerService.getDeliveryOrders(req.params.id as string);
    return res.status(200).json(successResponse(data));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
}
```

5. Add new controller method `updateDeliveryOrderPrices`:
```typescript
const updatePricesSchema = z.object({
  updates: z.array(z.object({
    delivery_order_id: z.string().uuid(),
    unit_price: z.number().min(0),
    price_confirmed: z.boolean().optional(),
  })).min(1),
});

static async updateDeliveryOrderPrices(req: Request, res: Response) {
  try {
    const validated = updatePricesSchema.parse(req.body);
    const data = await CustomerService.updateDeliveryOrderPrices(validated.updates);
    return res.status(200).json(successResponse(data, 'Prices updated'));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
}
```

**Actions in `customers.service.ts`:**
1. Add `bulkSetLoyal` method:
```typescript
static async bulkSetLoyal(ids: string[]) {
  const { data, error } = await supabaseService
    .from('customers')
    .update({ is_loyal: true })
    .in('id', ids)
    .is('deleted_at', null)
    .select('*');
  if (error) throw error;
  return data;
}
```

2. Add `getAll` enhancement — accept `is_loyal` filter. Modify existing `getAll` method (line 7-15):
```typescript
static async getAll(type?: string, isLoyal?: boolean) {
  let query = supabaseService.from('customers').select('*').is('deleted_at', null);
  if (type) {
    query = query.eq('customer_type', type);
  }
  if (isLoyal !== undefined) {
    query = query.eq('is_loyal', isLoyal);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

3. Add `getDeliveryOrders` method:
```typescript
static async getDeliveryOrders(customerId: string) {
  // Step 1: Get import_order IDs for this customer
  const { data: importOrders, error: ioError } = await supabaseService
    .from('import_orders')
    .select('id')
    .eq('customer_id', customerId)
    .is('deleted_at', null);
  if (ioError) throw ioError;
  if (!importOrders || importOrders.length === 0) return [];

  const importOrderIds = importOrders.map(io => io.id);

  // Step 2: Get delivery_orders linked to these import_orders (standard/grocery only)
  // Process in chunks of 100 to avoid PostgREST limits
  const chunkSize = 100;
  let allDeliveryOrders: any[] = [];
  for (let i = 0; i < importOrderIds.length; i += chunkSize) {
    const chunk = importOrderIds.slice(i, i + chunkSize);
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .select('*, delivery_vehicles(*, profiles:driver_id(full_name))')
      .in('import_order_id', chunk)
      .eq('order_category', 'standard')
      .order('delivery_date', { ascending: false });
    if (error) throw error;
    if (data) allDeliveryOrders = allDeliveryOrders.concat(data);
  }

  return allDeliveryOrders;
}
```

4. Add `updateDeliveryOrderPrices` method:
```typescript
static async updateDeliveryOrderPrices(updates: Array<{ delivery_order_id: string; unit_price: number; price_confirmed?: boolean }>) {
  const results = [];
  for (const update of updates) {
    const { data, error } = await supabaseService
      .from('delivery_orders')
      .update({
        unit_price: update.unit_price,
        price_confirmed: update.price_confirmed ?? true,
      })
      .eq('id', update.delivery_order_id)
      .select('*')
      .single();
    if (error) throw error;
    results.push(data);
  }
  return results;
}
```

**QA:**
- Verify Zod schemas compile without type errors
- Verify `bulkSetLoyal` updates multiple customers atomically
- Verify `getDeliveryOrders` returns delivery orders with nested `delivery_vehicles` and `profiles`

---

### Task 3: Backend — Add new routes - [x]
**Files to modify:**
- `server/src/modules/customers/customers.routes.ts`
- `server/src/modules/customers/customers.controller.ts` (update `getAll` to accept `is_loyal` query param)

**Actions in `customers.routes.ts`:**
1. Read the file to understand existing route pattern and middleware imports
2. Add these routes (following existing pattern — look at how routes are structured with `requirePolicy` middleware):
```typescript
// Bulk set loyal — PUT /customers/bulk-loyal
// MUST be placed BEFORE /:id routes to avoid conflict
router.put('/bulk-loyal', CustomerController.bulkSetLoyal);

// Get delivery orders for customer
router.get('/:id/delivery-orders', CustomerController.getDeliveryOrders);

// Update delivery order prices for customer
router.put('/:id/delivery-order-prices', CustomerController.updateDeliveryOrderPrices);
```

**Actions in `customers.controller.ts` — update `getAll`:**
1. Modify the `getAll` method (line 36-44) to pass `is_loyal` query param:
```typescript
static async getAll(req: Request, res: Response) {
  try {
    const type = req.query.type as string | undefined;
    const isLoyalParam = req.query.is_loyal as string | undefined;
    const isLoyal = isLoyalParam === 'true' ? true : isLoyalParam === 'false' ? false : undefined;
    const data = await CustomerService.getAll(type, isLoyal);
    return res.status(200).json(successResponse(data));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
}
```

**QA:**
- `GET /customers?is_loyal=true` returns only loyal customers
- `GET /customers?type=grocery_sender` still works as before
- `PUT /customers/bulk-loyal` with `{ "ids": ["..."] }` returns 200
- `GET /customers/:id/delivery-orders` returns array
- `PUT /customers/:id/delivery-order-prices` with `{ "updates": [...] }` returns 200

---

### Task 4: Frontend — Update types + API client + hooks - [x]
**Files to modify:**
- `client/src/types/index.ts`
- `client/src/api/customersApi.ts`
- `client/src/hooks/queries/useCustomers.ts`

**Actions in `client/src/types/index.ts`:**
1. Add `is_loyal` to Customer interface (after line 170 `deleted_at`):
```typescript
export interface Customer {
  // ... existing fields ...
  deleted_at?: string | null;
  is_loyal?: boolean; // ADD THIS
}
```

2. Add `price_confirmed` to DeliveryOrder interface (after line 301 `warehouse_confirmed_at`):
```typescript
// In the DeliveryOrder interface, add:
price_confirmed?: boolean;
```

**Actions in `client/src/api/customersApi.ts`:**
1. Add new methods after existing methods (before closing `};` at line 63):
```typescript
getLoyalCustomers: async () => {
  const { data } = await axiosClient.get<Customer[]>('/customers', { params: { is_loyal: 'true' } });
  return data;
},

bulkSetLoyal: async (ids: string[]) => {
  const { data } = await axiosClient.put('/customers/bulk-loyal', { ids });
  return data;
},

getDeliveryOrders: async (id: string) => {
  const { data } = await axiosClient.get(`/customers/${id}/delivery-orders`);
  return data;
},

updateDeliveryOrderPrices: async (id: string, updates: Array<{ delivery_order_id: string; unit_price: number; price_confirmed?: boolean }>) => {
  const { data } = await axiosClient.put(`/customers/${id}/delivery-order-prices`, { updates });
  return data;
},
```

**Actions in `client/src/hooks/queries/useCustomers.ts`:**
1. Add query key entries to `customerKeys` object (after line 11):
```typescript
loyalList: () => [...customerKeys.all, 'loyal-list'] as const,
deliveryOrders: (id: string) => [...customerKeys.all, 'delivery-orders', id] as const,
```

2. Add new hooks after existing hooks (before EOF):
```typescript
export function useLoyalCustomers() {
  return useQuery({
    queryKey: customerKeys.loyalList(),
    queryFn: () => customersApi.getLoyalCustomers(),
  });
}

export function useBulkSetLoyal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => customersApi.bulkSetLoyal(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Đã chuyển thành khách hàng thân thiết');
    },
    onError: () => toast.error('Lỗi khi cập nhật khách hàng thân thiết'),
  });
}

export function useCustomerDeliveryOrders(id: string) {
  return useQuery({
    queryKey: customerKeys.deliveryOrders(id),
    queryFn: () => customersApi.getDeliveryOrders(id),
    enabled: !!id,
  });
}

export function useUpdateDeliveryOrderPrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, updates }: { customerId: string; updates: Array<{ delivery_order_id: string; unit_price: number; price_confirmed?: boolean }> }) =>
      customersApi.updateDeliveryOrderPrices(customerId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.deliveryOrders(variables.customerId) });
      toast.success('Đã lưu đơn giá');
    },
    onError: () => toast.error('Lỗi khi lưu đơn giá'),
  });
}
```

**QA:**
- TypeScript: `npm run build` in `client/` — no type errors
- Verify: `useLoyalCustomers()` hook returns data typed as `Customer[]`
- Verify: all new API functions match backend endpoints

---

### Task 5: Frontend — GroceryCustomersPage: add checkbox column - [x]
**Files to modify:**
- `client/src/pages/customers/GroceryCustomersPage.tsx`

**Precondition:** This task ONLY adds checkboxes when `type === 'grocery_sender'`. The `grocery_receiver` page should NOT show checkboxes.

**Actions:**
1. Add new imports at top (line 8 area):
```typescript
import { Plus, Pencil, Trash2, Heart } from 'lucide-react'; // Add Heart
```
Add hook import:
```typescript
import { useCustomers, useDeleteCustomer, useBulkSetLoyal } from '../../hooks/queries/useCustomers';
```

2. Add state variables (after line 48 `searchTerm`):
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const bulkSetLoyal = useBulkSetLoyal();
const showLoyalCheckbox = type === 'grocery_sender';
```

3. Add helper functions (after `filteredAndSortedCustomers` at line 99):
```typescript
const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === filteredAndSortedCustomers.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filteredAndSortedCustomers.map(c => c.id)));
  }
};

const handleBulkLoyal = async () => {
  if (selectedIds.size === 0) return;
  try {
    await bulkSetLoyal.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  } catch {
    // Error handled by mutation
  }
};
```

4. Add conditional button bar — INSERT right before the table container `<div className="md:bg-white...">` (before line 139). Only show when `showLoyalCheckbox && selectedIds.size > 0`:
```tsx
{showLoyalCheckbox && selectedIds.size > 0 && (
  <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-2 mx-0 sm:mx-0">
    <span className="text-[13px] font-bold text-amber-800">
      Đã chọn {selectedIds.size} khách hàng
    </span>
    <button
      onClick={handleBulkLoyal}
      disabled={bulkSetLoyal.isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-[13px] font-bold hover:bg-amber-600 shadow-sm transition-all disabled:opacity-50"
    >
      <Heart size={14} />
      Chuyển thành KH thân thiết
    </button>
  </div>
)}
```

5. Add checkbox header in desktop `<thead>` (before the "Tên KH" `<th>` at line 153). Only when `showLoyalCheckbox`:
```tsx
{showLoyalCheckbox && (
  <th className="px-4 py-3 w-10">
    <input
      type="checkbox"
      checked={selectedIds.size > 0 && selectedIds.size === filteredAndSortedCustomers.length}
      onChange={toggleSelectAll}
      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
    />
  </th>
)}
```

6. Add checkbox cell in each desktop `<tr>` (before the "Tên KH" `<td>` at line 172). Only when `showLoyalCheckbox`:
```tsx
{showLoyalCheckbox && (
  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
    <input
      type="checkbox"
      checked={selectedIds.has(c.id)}
      onChange={() => toggleSelect(c.id)}
      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
    />
  </td>
)}
```

7. Clear selectedIds when search changes — add to setSearchTerm callback or add useEffect:
```typescript
// In the SearchInput onSearch callback, add:
// setSelectedIds(new Set()); // Clear selection on search
```

**QA:**
- Verify: On `/khach-hang/nguoi-gui-tap-hoa` (grocery_sender) → checkboxes visible in desktop table
- Verify: On `/khach-hang/nguoi-nhan-tap-hoa` (grocery_receiver) → NO checkboxes
- Verify: Clicking checkbox does NOT navigate to detail page
- Verify: "Select all" toggles all visible (filtered) rows
- Verify: Button bar appears when ≥1 selected, shows correct count
- Verify: After bulk update success, checkboxes clear and list refetches
- Verify: Mobile view has NO checkboxes (unchanged)

---

### Task 6: Frontend — Create LoyalCustomersPage + Route + Navigation - [x]
**Files to create:**
- `client/src/pages/customers/LoyalCustomersPage.tsx` (NEW FILE)

**Files to modify:**
- `client/src/App.tsx`
- `client/src/data/moduleData.ts`

**Actions — Create `LoyalCustomersPage.tsx`:**
1. Create a new page based on GroceryCustomersPage structure, but simplified:
   - Uses `useLoyalCustomers()` hook instead of `useCustomers(type)`
   - NO checkbox column (customers are already loyal)
   - Table columns: same as GroceryCustomersPage (Tên KH, Loại KH, SDT, Địa chỉ, Số đơn, Doanh thu, Công nợ, Thao tác)
   - Page title: "Khách hàng thân thiết"
   - Description: "Quản lý khách hàng thân thiết"
   - backPath: `/khach-hang`
   - Row click navigates to `/ke-toan/khach-hang/${c.id}` (SAME as all other customer pages)
   - Has FAB + AddEditCustomerDialog (create/edit) + ConfirmDialog (delete) — same pattern
   - Has search functionality — same pattern
   - Mobile view — same card layout pattern

**IMPORTANT**: Copy the structure from GroceryCustomersPage but:
- Import `useLoyalCustomers` instead of `useCustomers`
- Remove the `Props` interface (no `type` prop needed)
- Change `useCustomers(type)` → `useLoyalCustomers()`
- Change `pageTitle` → `"Khách hàng thân thiết"`
- Change `backPath` → `/khach-hang`
- Keep all table columns, mobile view, edit/delete actions IDENTICAL

**Actions — Update `App.tsx`:**
1. Add import (around line 35-40):
```typescript
import LoyalCustomersPage from './pages/customers/LoyalCustomersPage';
```

2. Add route inside `/khach-hang` block (after line 138, before `</Route>`):
```tsx
<Route path="khach-hang-than-thiet" element={<LoyalCustomersPage />} />
```

**Actions — Update `moduleData.ts`:**
1. Add a new section in the `/khach-hang` module (after line 72, before the closing `]`):
```typescript
{
  section: 'Khách hàng thân thiết',
  items: [
    { icon: Heart, title: 'DS KH thân thiết', description: 'Quản lý khách hàng thân thiết.', colorScheme: 'amber', path: '/khach-hang/khach-hang-than-thiet' },
  ]
}
```

2. Add `Heart` to the import from `lucide-react` at line 1-6:
```typescript
import {
  Users,
  Warehouse, Download, Upload, Truck as DeliveryIcon,
  Banknote, Car, CalendarDays, ClipboardList, ClipboardCheck, DollarSign, FileText, Settings2, MapPin,
  Send, Store, Receipt, History, Heart, // ADD Heart
} from 'lucide-react';
```

**QA:**
- Verify: `/khach-hang/khach-hang-than-thiet` loads without errors
- Verify: Module card "DS KH thân thiết" appears in `/khach-hang` module page
- Verify: Only loyal customers appear in the list
- Verify: Row click navigates to `/ke-toan/khach-hang/:id` detail page
- Verify: Empty state shows when no loyal customers exist
- Verify: Search, create, edit, delete all work

---

### Task 7: Frontend — Add dynamic "Đơn hàng" tab to CustomerDetailPage
**Files to modify:**
- `client/src/pages/customers/CustomerDetailPage.tsx`

**Actions:**
1. Add new imports (at top, line 4-8 area):
```typescript
import { useCustomerDeliveryOrders, useUpdateDeliveryOrderPrices } from '../../hooks/queries/useCustomers';
import { Printer, ShoppingBag, Save } from 'lucide-react'; // Add these icons
```

2. Refactor TABS from static `as const` to dynamic. Replace lines 40-47:
```typescript
// REMOVE the static TABS const and TabId type

// INSIDE the component function (after customer data is loaded), use useMemo:
const TABS = React.useMemo(() => {
  const baseTabs = [
    { id: 'overview' as const, label: 'Tổng quan', mobileLabel: 'Tổng quan', icon: Building2 },
    { id: 'imports' as const, label: 'Phiếu nhập', mobileLabel: 'Nhập', icon: PackageCheck },
    { id: 'exports' as const, label: 'Phiếu xuất', mobileLabel: 'Xuất', icon: FileSpreadsheet },
    { id: 'receipts' as const, label: 'Lịch sử thu nợ', mobileLabel: 'Thu nợ', icon: Receipt },
  ];
  if (customer?.is_loyal) {
    baseTabs.push({ id: 'orders' as const, label: 'Đơn hàng', mobileLabel: 'Đơn hàng', icon: ShoppingBag });
  }
  return baseTabs;
}, [customer?.is_loyal]);

type TabId = 'overview' | 'imports' | 'exports' | 'receipts' | 'orders';
```

3. Move `TABS` and `TabId` declarations INSIDE the component (after `customer` data is available, around line 60). The `useState<TabId>('overview')` stays the same.

4. Update the grid layout for tabs to accommodate 5 tabs when visible:
```tsx
// In the tabs container (line 118), change grid-cols-4 to dynamic:
<div className={clsx(
  "grid gap-1 md:flex md:gap-2 ...",
  TABS.length === 5 ? "grid-cols-5" : "grid-cols-4"
)}>
```

5. Add data fetch for delivery orders (after other hook calls around line 59):
```typescript
const { data: deliveryOrders, isLoading: isLoadingDeliveryOrders } = useCustomerDeliveryOrders(
  customer?.is_loyal ? id! : ''
);
```
Note: Pass empty string when not loyal to disable the query (enabled: !!id already handles this).

6. Add state for orders tab (after existing state declarations around line 54):
```typescript
const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
const updatePrices = useUpdateDeliveryOrderPrices();
```

7. Add the Orders tab content AFTER the receipts tab block (after line 411, before the closing `</div>` of tab content container). Create this as a substantial block:

```tsx
{/* TAB: ORDERS (Loyal customers only) */}
{activeTab === 'orders' && customer?.is_loyal && (
  <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
    {/* Action bar */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/10 shrink-0">
      <span className="text-[13px] font-bold text-muted-foreground">
        {selectedOrderIds.size > 0 ? `Đã chọn ${selectedOrderIds.size} đơn hàng` : 'Đơn hàng giao cho khách'}
      </span>
      <div className="flex items-center gap-2">
        {selectedOrderIds.size > 0 && (
          <>
            <button
              onClick={handleSavePrices}
              disabled={updatePrices.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              Lưu đơn giá
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 transition-colors"
            >
              <Printer size={14} />
              In phiếu
            </button>
          </>
        )}
      </div>
    </div>

    {isLoadingDeliveryOrders ? (
      <div className="p-4"><LoadingSkeleton rows={5} columns={7} /></div>
    ) : !deliveryOrders?.length ? (
      <EmptyState title="Không có đơn hàng" />
    ) : (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block flex-1 overflow-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.size > 0 && selectedOrderIds.size === deliveryOrders.length}
                    onChange={() => {
                      if (selectedOrderIds.size === deliveryOrders.length) {
                        setSelectedOrderIds(new Set());
                      } else {
                        setSelectedOrderIds(new Set(deliveryOrders.map((o: any) => o.id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Ngày giờ giao</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Số lượng</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Tên hàng</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Đơn giá</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-left">Nhân viên giao</th>
                <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {deliveryOrders.map((o: any) => {
                const currentPrice = editingPrices[o.id] ?? o.unit_price ?? 0;
                const thanhTien = o.total_quantity * currentPrice;
                const driverNames = (o.delivery_vehicles || [])
                  .map((dv: any) => dv.profiles?.full_name)
                  .filter(Boolean)
                  .join(', ') || '-';
                const deliveryDateTime = [
                  o.delivery_date ? formatDate(o.delivery_date) : '-',
                  o.delivery_time ? o.delivery_time.slice(0, 5) : '',
                ].filter(Boolean).join(' ');

                return (
                  <tr
                    key={o.id}
                    className={clsx(
                      "hover:bg-muted/20 transition-colors",
                      o.price_confirmed && "bg-emerald-50/30",
                      selectedOrderIds.has(o.id) && "bg-primary/5"
                    )}
                    data-print-row={selectedOrderIds.has(o.id) ? "true" : "false"}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(o.id)}
                        onChange={() => {
                          setSelectedOrderIds(prev => {
                            const next = new Set(prev);
                            if (next.has(o.id)) next.delete(o.id);
                            else next.add(o.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">{deliveryDateTime}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-right tabular-nums">{o.total_quantity}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-foreground">{o.product_name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editingPrices[o.id] ?? o.unit_price ?? ''}
                        onChange={(e) => {
                          setEditingPrices(prev => ({
                            ...prev,
                            [o.id]: Number(e.target.value) || 0,
                          }));
                        }}
                        placeholder="Nhập giá"
                        className="w-28 px-2 py-1 text-[13px] font-bold text-right tabular-nums border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none bg-white"
                      />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{driverNames}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-emerald-600 text-right tabular-nums">
                      {formatCurrency(thanhTien)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-3 px-4 pb-24 pt-2">
          {deliveryOrders.map((o: any) => {
            const currentPrice = editingPrices[o.id] ?? o.unit_price ?? 0;
            const thanhTien = o.total_quantity * currentPrice;
            const driverNames = (o.delivery_vehicles || [])
              .map((dv: any) => dv.profiles?.full_name)
              .filter(Boolean)
              .join(', ') || '-';

            return (
              <div key={o.id} className="bg-white p-4 rounded-2xl shadow-sm border border-border flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[14px] font-bold text-foreground">{o.product_name}</span>
                    <span className="text-[12px] text-muted-foreground block">
                      {o.delivery_date ? formatDate(o.delivery_date) : '-'}
                      {o.delivery_time ? ` ${o.delivery_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(o.id)}
                    onChange={() => {
                      setSelectedOrderIds(prev => {
                        const next = new Set(prev);
                        if (next.has(o.id)) next.delete(o.id);
                        else next.add(o.id);
                        return next;
                      });
                    }}
                    className="w-4 h-4 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground">SL</span>
                    <span className="text-[13px] font-bold block">{o.total_quantity}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">Đơn giá</span>
                    <input
                      type="number"
                      value={editingPrices[o.id] ?? o.unit_price ?? ''}
                      onChange={(e) => setEditingPrices(prev => ({ ...prev, [o.id]: Number(e.target.value) || 0 }))}
                      placeholder="Nhập giá"
                      className="w-full px-2 py-1 text-[13px] font-bold border border-border rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">NV giao</span>
                    <span className="text-[12px] block">{driverNames}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground">Thành tiền</span>
                    <span className="text-[13px] font-bold text-emerald-600 block">{formatCurrency(thanhTien)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
  </div>
)}
```

8. Add handler functions (inside the component, after existing handlers):

```typescript
const handleSavePrices = async () => {
  if (selectedOrderIds.size === 0 || !id) return;
  const updates = Array.from(selectedOrderIds)
    .map(orderId => {
      const order = deliveryOrders?.find((o: any) => o.id === orderId);
      if (!order) return null;
      const price = editingPrices[orderId] ?? order.unit_price ?? 0;
      return {
        delivery_order_id: orderId,
        unit_price: price,
        price_confirmed: true,
      };
    })
    .filter(Boolean) as Array<{ delivery_order_id: string; unit_price: number; price_confirmed: boolean }>;

  if (updates.length === 0) return;

  try {
    await updatePrices.mutateAsync({ customerId: id, updates });
    setSelectedOrderIds(new Set());
    setEditingPrices({});
  } catch {
    // Error handled by mutation
  }
};

const handlePrint = () => {
  window.print();
};
```

**QA:**
- Verify: Tab "Đơn hàng" ONLY appears when `customer.is_loyal === true`
- Verify: Tab does NOT appear for regular customers
- Verify: Table shows all delivery orders with correct data
- Verify: Unit price input is editable; typing updates "Thành tiền" reactively
- Verify: Checking rows enables "Lưu đơn giá" and "In phiếu" buttons
- Verify: "Lưu đơn giá" calls API and saves successfully
- Verify: "In phiếu" triggers browser print dialog

---

### Task 8: Frontend — Print CSS with @media print
**Files to modify:**
- `client/src/index.css` (or equivalent global CSS file)

**Actions:**
1. Find the global CSS file (likely `client/src/index.css` or `client/src/App.css`)
2. Add `@media print` rules at the end of the file:

```css
/* Print styles for loyal customer invoice */
@media print {
  /* Hide everything except the orders table */
  body * {
    visibility: hidden;
  }

  /* Show the print area */
  [data-print-area="loyal-orders"],
  [data-print-area="loyal-orders"] * {
    visibility: visible;
  }

  [data-print-area="loyal-orders"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }

  /* Hide unchecked rows */
  [data-print-row="false"] {
    display: none !important;
  }

  /* Hide checkboxes and action bar in print */
  [data-print-hide] {
    display: none !important;
  }

  /* Clean table styling for print */
  [data-print-area="loyal-orders"] table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  [data-print-area="loyal-orders"] th,
  [data-print-area="loyal-orders"] td {
    border: 1px solid #ccc;
    padding: 6px 8px;
  }

  [data-print-area="loyal-orders"] th {
    background-color: #f0f0f0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide input borders, show value as text */
  [data-print-area="loyal-orders"] input[type="number"] {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    outline: none !important;
  }

  /* Print header */
  .print-header {
    visibility: visible;
    display: block !important;
    text-align: center;
    margin-bottom: 16px;
  }

  .print-header h2 {
    font-size: 18px;
    font-weight: bold;
    margin: 0;
  }

  .print-header p {
    font-size: 13px;
    color: #666;
    margin: 4px 0;
  }
}
```

3. Back in `CustomerDetailPage.tsx`, wrap the orders desktop table with `data-print-area` attribute:
```tsx
<div className="hidden md:block flex-1 overflow-auto" data-print-area="loyal-orders">
  {/* Add print header (hidden on screen, visible on print) */}
  <div className="print-header hidden">
    <h2>PHIẾU GIAO HÀNG</h2>
    <p>Khách hàng: {customer.name}</p>
    <p>Điện thoại: {customer.phone || '-'} | Địa chỉ: {customer.address || '-'}</p>
  </div>
  <table ...>
```

4. Add `data-print-hide` to checkbox column header and cells, and to the action bar:
```tsx
// On the checkbox <th>:
<th className="..." data-print-hide>

// On the checkbox <td>:
<td className="..." data-print-hide>

// On the action bar div:
<div className="... shrink-0" data-print-hide>
```

**QA:**
- Verify: `window.print()` shows only checked order rows
- Verify: Checkboxes are hidden in print output
- Verify: Input fields show values without borders in print
- Verify: Print header "PHIẾU GIAO HÀNG" with customer info is visible
- Verify: Unchecked rows are hidden in print
- Verify: Normal screen view is unaffected by print CSS

---

### Task 9: Backend — Add `getBackPath` support for loyal customers - [x]
**Files to modify:**
- `client/src/pages/customers/CustomerDetailPage.tsx`

**Actions:**
1. In the `getBackPath` function (line 87-94), add case for loyal customers:
```typescript
const getBackPath = (type?: string) => {
  // If customer is loyal, back to loyal customers page
  if (customer?.is_loyal) return '/khach-hang/khach-hang-than-thiet';
  switch (type) {
    case 'wholesale': return '/khach-hang/vua-rau';
    case 'grocery': return '/khach-hang/nguoi-gui-tap-hoa';
    case 'vegetable': return '/khach-hang/nguoi-gui-rau';
    default: return '/khach-hang';
  }
};
```

**Note:** This is optional — if user navigated from `/ke-toan`, the back button may feel odd going to `/khach-hang/...`. But this is consistent with the current pattern where all customer pages have a `getBackPath` based on customer_type. The `is_loyal` check takes priority.

**QA:**
- Verify: Loyal customer detail page "back" button goes to `/khach-hang/khach-hang-than-thiet`
- Verify: Non-loyal customer detail page "back" button behavior unchanged

---

### Task 10: Breadcrumb configuration for new route - [x]
**Files to modify:**
- Check if breadcrumb data exists in `client/src/data/` or `client/src/context/BreadcrumbContext` and add entry for the new route

**Actions:**
1. Search for breadcrumb configuration (grep for `khach-hang-than-thiet` or similar route patterns in breadcrumb config)
2. Add breadcrumb entry for `/khach-hang/khach-hang-than-thiet` → "KH thân thiết"
3. Follow the pattern used by other `/khach-hang/*` routes

**QA:**
- Verify: Breadcrumb shows correct path when on the loyal customers page
- Verify: Breadcrumb shows correct path when on loyal customer detail page

## Final Verification Wave - [x]

> **STOP**: Before marking this plan complete, the implementer MUST:
> 1. Run `npm run build` in both `client/` and `server/` — ZERO errors
> 2. Verify all new routes load without blank screens
> 3. Test checkbox select → bulk loyal update → page refetch
> 4. Test orders tab appears only for is_loyal=true customers
> 5. Test inline unit_price edit → save → thành tiền recalculates
> 6. Test print button → browser print dialog shows only checked rows
> 7. Explicitly confirm to user: "All verification steps passed"
