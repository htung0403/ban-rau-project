# Plan: Redesign Tồn Kho (WarehousesPage) + Warehouse Confirmation Flow

## Context
Redesign `WarehousesPage` to match DeliveryPage's "Cần giao" tab layout. Add admin warehouse confirmation flow for old inventory items.

## Key Decisions Made
| Decision | Choice | Rationale |
|----------|--------|-----------|
| What Tồn kho shows | Only "old" orders (isOldOrderForAgeRule) with remaining > 0, PLUS old fully-assigned awaiting admin confirmation | Narrowed scope from "all remaining" to "old only" |
| Status tabs | No tabs | Keep simple — age filter (Mới/Cũ/Tất cả) is sufficient |
| Vehicle columns | Full vehicle columns like DeliveryPage Cần giao tab | User confirmed |
| After admin confirm | Item disappears from Tồn kho permanently | Even if vehicle reverted later |
| Revert after confirmation | Confirmation is permanent — warehouse_confirmed_at stays | Simplifies logic |
| Action buttons | Only Phân xe + Xác nhận (admin, old+fully-assigned) | Keep minimal |
| VegetableWarehousePage | Not in this plan — do later | User confirmed |
| Bulk edit/print/images/payment | NOT included | Out of scope |

## Scope Boundaries
**IN:**
- Extract `isOldOrderForAgeRule` + helpers to shared utility
- Add `warehouse_confirmed_at` DB column + type field
- New server endpoint `PUT /delivery/warehouse-confirm`
- New hook `useConfirmWarehouse` + API wrapper
- Rewrite WarehousesPage UI: table with vehicle columns, date grouping, age badges, mobile cards
- Admin "Xác nhận" button for old + fully-assigned + unconfirmed items

**OUT:**
- VegetableWarehousePage changes (later)
- Bulk edit, bulk assign dialogs
- Print/export functionality
- Image viewer/gallery
- Payment status column
- Revert vehicle from warehouse page
- Edit/Delete buttons on warehouse page
- Status tabs on warehouse page
- Changes to DeliveryPage behavior

## File Map (files to modify/create)

| File | Action | Purpose |
|------|--------|---------|
| `client/src/lib/deliveryAgeRule.ts` | CREATE | Shared `isOldOrderForAgeRule`, `getEffectiveDeliveryStatus`, `getDeliveryRemainingQty` |
| `client/src/pages/delivery/DeliveryPage.tsx` | MODIFY | Remove local age rule functions, import from shared utility |
| `client/src/types/index.ts` | MODIFY | Add `warehouse_confirmed_at?: string \| null` to DeliveryOrder |
| `server/src/modules/delivery/delivery.service.ts` | MODIFY | Add `confirmWarehouse(ids)` method |
| `server/src/modules/delivery/delivery.controller.ts` | MODIFY | Add `confirmWarehouse` controller method |
| `server/src/modules/delivery/delivery.routes.ts` | MODIFY | Add `PUT /warehouse-confirm` route |
| `client/src/api/deliveryApi.ts` | MODIFY | Add `confirmWarehouse(ids)` API wrapper |
| `client/src/hooks/queries/useDelivery.ts` | MODIFY | Add `useConfirmWarehouse` hook |
| `client/src/pages/warehouse/WarehousesPage.tsx` | REWRITE | Full redesign to match DeliveryPage layout |

---

## Tasks

### Task 1: Extract shared age rule utilities
**Files:** `client/src/lib/deliveryAgeRule.ts` (CREATE), `client/src/pages/delivery/DeliveryPage.tsx` (MODIFY)

**What to do:**
1. Create `client/src/lib/deliveryAgeRule.ts` exporting:
   - `getDeliveryRemainingQty(order: DeliveryOrder): number` — copy from DeliveryPage line 159-165
   - `getEffectiveDeliveryStatus(order: DeliveryOrder, remainingQty?: number): DeliveryStatus` — copy from DeliveryPage lines 168-174
   - `isOldOrderForAgeRule(order: DeliveryOrder, anchorDate: string): boolean` — copy from DeliveryPage lines 176-189

2. In `DeliveryPage.tsx`:
   - Add import: `import { isOldOrderForAgeRule, getEffectiveDeliveryStatus, getDeliveryRemainingQty } from '../../lib/deliveryAgeRule';`
   - Remove the 3 local function declarations (lines 159-189)
   - All existing usages remain unchanged since function signatures are identical

**Import types needed in the new file:**
```typescript
import type { DeliveryOrder, DeliveryStatus } from '../types';
```

**QA:**
- Run `npx tsc --noEmit` from `client/` — must pass with zero errors
- Verify with `ast_grep_search` that no local `isOldOrderForAgeRule` remains in DeliveryPage.tsx
- Grep to confirm the shared file exports all 3 functions

---

### Task 2: Add `warehouse_confirmed_at` to DeliveryOrder type
**File:** `client/src/types/index.ts`

**What to do:**
- Add `warehouse_confirmed_at?: string | null;` to the `DeliveryOrder` interface, right after `confirmed_at` (line ~299)

**Exact edit — find this block (around line 298-300):**
```typescript
  /** Thời điểm xác nhận chuyển từ hang_o_sg → can_giao */
  confirmed_at?: string | null;
  export_order_payment_status?: PaymentStatus;
```
**Replace with:**
```typescript
  /** Thời điểm xác nhận chuyển từ hang_o_sg → can_giao */
  confirmed_at?: string | null;
  /** Thời điểm admin xác nhận đã giao hàng tồn kho — khi set thì ẩn khỏi trang Tồn kho */
  warehouse_confirmed_at?: string | null;
  export_order_payment_status?: PaymentStatus;
```

**QA:**
- `npx tsc --noEmit` passes
- `lsp_find_references` on DeliveryOrder to verify no breaking changes

---

### Task 3: Server — Add warehouse confirmation endpoint
**Files:** `server/src/modules/delivery/delivery.service.ts`, `delivery.controller.ts`, `delivery.routes.ts`

**3a. Service method** — Add to `DeliveryService` class in `delivery.service.ts` (before the closing `}` of the class):
```typescript
static async confirmWarehouse(ids: string[]) {
  const { data, error } = await supabaseService
    .from('delivery_orders')
    .update({ warehouse_confirmed_at: new Date().toISOString() })
    .in('id', ids)
    .select('id');

  if (error) throw error;
  return { success: true, confirmed: (data || []).length };
}
```

**3b. Controller method** — Add to `DeliveryController` class in `delivery.controller.ts` (before closing `}`):
```typescript
static async confirmWarehouse(req: Request, res: Response) {
  try {
    const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);
    const data = await DeliveryService.confirmWarehouse(ids);
    return res.status(200).json(successResponse(data, 'Đã xác nhận giao hàng tồn kho'));
  } catch (err: any) {
    return res.status(400).json(errorResponse(err.message));
  }
}
```

**3c. Route** — Add in `delivery.routes.ts` AFTER `router.put('/confirm', ...)` (line 14) and BEFORE `router.put('/:id/assign-vehicle', ...)` (line 15):
```typescript
router.put('/warehouse-confirm', DeliveryController.confirmWarehouse);
```

**IMPORTANT order**: The new route MUST be placed before `/:id/...` wildcard routes, otherwise Express will treat `warehouse-confirm` as an `:id` parameter.

**QA:**
- Server compiles without errors
- Route is registered correctly (check via server logs on startup)
- Verify admin-only is enforced via the existing `requirePolicy('PRODUCTS_DELIVERY_ACCESS')` middleware already on the router

---

### Task 4: Client API + Hook for warehouse confirmation
**Files:** `client/src/api/deliveryApi.ts`, `client/src/hooks/queries/useDelivery.ts`

**4a. API wrapper** — Add to `deliveryApi` object in `deliveryApi.ts` (after `confirmOrders`):
```typescript
confirmWarehouse: async (ids: string[]) => {
  const { data } = await axiosClient.put('/delivery/warehouse-confirm', { ids });
  return data;
},
```

**4b. Hook** — Add to `useDelivery.ts` (after `useConfirmDelivery`):
```typescript
export function useConfirmWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deliveryApi.confirmWarehouse(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      toast.success('Đã xác nhận giao hàng tồn kho');
    },
    onError: () => toast.error('Lỗi khi xác nhận tồn kho'),
  });
}
```

**QA:**
- `npx tsc --noEmit` passes from `client/`
- Hook follows same pattern as `useConfirmDelivery` (line 73-83)

---

### Task 5: Add `warehouse_confirmed_at` to Supabase select queries
**File:** `server/src/modules/delivery/delivery.service.ts`

**What to do:**
The `getAllToday` method's select query (line 239-241) already uses `*` which selects all columns from `delivery_orders`. Since Supabase `*` automatically includes new columns, NO change is needed here.

**Verify**: The `warehouse_confirmed_at` field will be automatically included in API responses because the query uses `select('*, ...')` on `delivery_orders`.

**QA:**
- After adding the DB column, verify the field appears in API response by checking browser network tab or curl

---

### Task 6: Rewrite WarehousesPage — Full UI Redesign
**File:** `client/src/pages/warehouse/WarehousesPage.tsx` (REWRITE)

This is the main task. The page must be rewritten to match DeliveryPage's "Cần giao" tab table layout.

**Imports to add (reference DeliveryPage lines 1-31):**
```typescript
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Calendar, Truck, Check, Store, Package, User, Image as ImageIcon, Eye, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDeliveryAnchorDateString } from '../../lib/deliveryDayAnchor';
import { isOldOrderForAgeRule, getEffectiveDeliveryStatus, getDeliveryRemainingQty } from '../../lib/deliveryAgeRule';
import { useConfirmWarehouse } from '../../hooks/queries/useDelivery';
import { VehicleCellTooltip } from '../delivery/components/VehicleCellTooltip';
import type { DeliveryOrder, DeliveryStatus, Vehicle } from '../../types';
```

**Keep existing imports:**
- `useDeliveryOrders`, `useDeleteDeliveryOrders` from hooks
- `useVehicles`, `useAuth`, `AssignVehicleDialog`, `DateRangePicker`, `MultiSearchableSelect`, `SearchInput`, `matchesSearch`, `MobileFilterSheet`
- `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PageHeader`
- `isSoftDeletedSourceOrder`, `deliveryOrderVisibleToUser`, `hasFullGoodsModuleAccess`

**Helper functions to copy from DeliveryPage (or import where extracted):**
```typescript
// Copy these locally (they are local to DeliveryPage, not worth extracting):
const formatNumber = (val?: number) => { /* same as DeliveryPage line 33-36 */ };
const vehicleSupportsGoodsCategory = (vehicle: Vehicle, category: 'grocery' | 'vegetable') => { /* DeliveryPage line 61-64 */ };
const getDisplayProductName = (order: DeliveryOrder) => { /* DeliveryPage line 66-67 */ };
const getReceiverDisplayName = (order: DeliveryOrder) => { /* DeliveryPage line 69-72 */ };
const pickRelation = <T,>(relation: any): T | undefined => { /* DeliveryPage line 74-77 */ };
const getImportReceivedByStaffName = (order: DeliveryOrder) => { /* DeliveryPage line 80-84 */ };
const isPaidCollectionStatus = (status?: string) => status === 'confirmed' || status === 'self_confirmed';
```

**State variables needed:**
```typescript
const [startDate, setStartDate] = useState<string>('');
const [endDate, setEndDate] = useState<string>('');
const [ageFilter, setAgeFilter] = useState<'all' | 'new' | 'old'>('all');
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 30;
const [searchQuery, setSearchQuery] = useState('');
const [filterCustomer, setFilterCustomer] = useState<string[]>([]);
const [filterReceiver, setFilterReceiver] = useState<string[]>([]);
const [filterProduct, setFilterProduct] = useState<string[]>([]);
const [filterVehicleIds, setFilterVehicleIds] = useState<string[]>([]);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
// Dialogs
const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
const [isAssignOpen, setIsAssignOpen] = useState(false);
const [isAssignClosing, setIsAssignClosing] = useState(false);
// Filter sheet (mobile)
const [isFilterOpen, setIsFilterOpen] = useState(false);
const [isFilterClosing, setIsFilterClosing] = useState(false);
```

**Data hooks:**
```typescript
const { user } = useAuth();
const { data: ordersRaw, isLoading, isError, refetch } = useDeliveryOrders(startDate || undefined, endDate || undefined, 'standard');
const { data: vehicles } = useVehicles();
const confirmWarehouseMutation = useConfirmWarehouse();
```

**Core filter logic — THIS IS THE KEY DIFFERENCE from DeliveryPage:**
```typescript
const anchorStr = getDeliveryAnchorDateString();

// Step 1: Filter base orders (no soft delete, visibility)
const orders = React.useMemo(() => {
  let base = (ordersRaw || []).filter((o) => !isSoftDeletedSourceOrder(o));
  if (user && !hasFullGoodsModuleAccess(user)) {
    base = base.filter((o) =>
      deliveryOrderVisibleToUser(o, { id: user.id, role: user.role, full_name: user.full_name }, vehicles || [])
    );
  }
  return base;
}, [ordersRaw, user, vehicles]);

// Step 2: Tồn kho filter — ONLY old items, NOT warehouse-confirmed
const inventoryOrders = React.useMemo(() => {
  return (orders || []).filter((o) => {
    // Skip if already warehouse-confirmed (permanent)
    if (o.warehouse_confirmed_at) return false;
    
    // Must be "old" by age rule
    if (!isOldOrderForAgeRule(o, anchorStr)) return false;
    
    // Show if: remaining > 0 (still has unassigned qty)
    // OR: remaining === 0 but not yet warehouse-confirmed (admin needs to confirm)
    const remaining = getDeliveryRemainingQty(o);
    return remaining > 0 || remaining <= 0;
    // Simplification: since we already check !warehouse_confirmed_at above,
    // any old + not-confirmed item should show. So just return true here.
  });
}, [orders, anchorStr]);
```

**Vehicle-related logic** — Copy from DeliveryPage lines 237-265:
```typescript
const isAdmin = user?.role === 'admin' || user?.role === 'manager';
const normalizedRole = (user?.role || '').toLowerCase();
const isLoader = normalizedRole.includes('lo_xe') || normalizedRole.includes('lơ xe');
const isDriver = normalizedRole === 'driver' || normalizedRole.includes('tai_xe') || normalizedRole.includes('tài xế') || normalizedRole.includes('driver');
const isDriverOrLoader = isDriver || isLoader;
const eligibleVehicles = React.useMemo(
  () => (vehicles || []).filter((vehicle) => vehicleSupportsGoodsCategory(vehicle, 'grocery')),
  [vehicles]
);
const myVehicleIds = React.useMemo(
  () => eligibleVehicles.filter((v) => 
    v.driver_id === user?.id || 
    v.in_charge_id === user?.id ||
    (user?.full_name && v.profiles?.full_name === user?.full_name) ||
    (user?.full_name && v.responsible_profile?.full_name === user?.full_name)
  ).map((v) => v.id),
  [eligibleVehicles, user]
);
const myVehicleIdSet = React.useMemo(() => new Set(myVehicleIds), [myVehicleIds]);
const myPrimaryVehicleId = myVehicleIds[0];
const canShowAssignButton = isAdmin || isLoader || (isDriver && myVehicleIds.length > 0);
const displayedVehicles = eligibleVehicles; // No tab-based filtering needed
```

**Filter/search logic** — Apply text search and dropdown filters to `inventoryOrders`, same pattern as DeliveryPage lines 487-519.

**Date grouping + sorting** — Same pattern as DeliveryPage lines 543-551:
```typescript
const groupedOrders = (paginatedOrders || []).reduce<Record<string, DeliveryOrder[]>>((acc, order) => {
  const date = order.delivery_date || 'N/A';
  if (!acc[date]) acc[date] = [];
  acc[date].push(order);
  return acc;
}, {});
const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));
```

**Desktop table structure** — Mirror DeliveryPage table with these columns:
1. Checkbox (admin only)
2. Thao tác (action buttons)
3. Loại (Mới/Cũ badge)
4. Người nhận
5. NV nhận hàng
6. Hàng (product name)
7. SL Tổng
8. Còn lại
9. Vehicle columns (one per eligible vehicle with license plate header)

**Action buttons per row:**
- If `remainingQty > 0` AND `canShowAssignButton`: Show "Phân xe" button (orange, Truck icon)
- If `remainingQty <= 0` AND `isAdmin` AND `!o.warehouse_confirmed_at`: Show "Xác nhận" button (green, Check icon)

**"Xác nhận" button handler:**
```typescript
const handleConfirmWarehouse = async (orderIds: string[]) => {
  try {
    await confirmWarehouseMutation.mutateAsync(orderIds);
  } catch {
    // Error handled by mutation
  }
};
```

**Bulk action bar** — When admin has selected items, show floating bar with:
- "Xác nhận tồn kho" button (for bulk warehouse confirmation)
- "Phân xe" button (opens BulkAssignVehicleDialog — NOT needed per scope, skip)
- Actually, keep bulk actions minimal: just "Xác nhận tồn kho" for selected old+fully-assigned items

**Mobile card layout** — Mirror DeliveryPage mobile cards (lines 1088-1341) but simplified:
- Card shows: receiver name, product name, NV nhận, age badge (Mới/Cũ), SL, remaining
- Vehicle chips at bottom showing assigned vehicles
- Action bar at bottom: "Phân xe" or "Xác nhận"

**Search/Filter bar** — Copy structure from DeliveryPage lines 558-672:
- SearchInput
- Desktop: MultiSearchableSelect for Tên vựa, Người nhận, Tên hàng, Biển số xe
- Age filter toggle: Tất cả / Hàng mới / Hàng cũ
- DateRangePicker
- Mobile filter button

**Pagination** — Always paginate at 30 items (not conditional like DeliveryPage):
```typescript
const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
```

**Dialog at bottom:**
```tsx
<AssignVehicleDialog
  isOpen={isAssignOpen}
  isClosing={isAssignClosing}
  order={selectedOrder}
  initialVehicleId={selectedVehicleId}
  allOrders={inventoryOrders || []}
  onClose={closeAssign}
/>
```

**QA:**
- Page renders at the existing route with new layout
- Vehicle columns display with correct license plates
- "Xác nhận" button visible ONLY for admin, ONLY on old+fully-assigned+unconfirmed items
- "Phân xe" button visible for eligible users on items with remaining > 0
- Click "Xác nhận" → item disappears after refetch
- Mobile cards render at viewport < 768px
- Search and filters work correctly
- Date grouping shows orders grouped by delivery_date
- `npx tsc --noEmit` passes

---

### Task 7: Add DB column via Supabase SQL
**Target:** Supabase dashboard or migration

**SQL to run:**
```sql
ALTER TABLE delivery_orders 
ADD COLUMN IF NOT EXISTS warehouse_confirmed_at TIMESTAMPTZ DEFAULT NULL;
```

**NOTE:** This is a manual step. The implementer should run this SQL in Supabase dashboard (SQL Editor) or create a migration file. Since there's no Prisma or migration tool detected in this project, a manual SQL execution is the expected approach.

**QA:**
- Verify column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_orders' AND column_name = 'warehouse_confirmed_at';`
- Verify all existing rows have NULL: `SELECT COUNT(*) FROM delivery_orders WHERE warehouse_confirmed_at IS NOT NULL;` → should be 0

---

## Execution Order

```
Task 7 (DB column) ──┐
                      ├──→ Task 3 (Server endpoint) ──→ Task 4 (Client API + Hook)
Task 1 (Extract utils)──→ Task 2 (Type update) ──────→ Task 5 (Verify select) ──→ Task 6 (UI Rewrite)
```

**Parallel tracks:**
- Track A: Task 7 → Task 3 → Task 4 (backend)
- Track B: Task 1 → Task 2 → Task 5 (shared prep)
- Merge: Task 6 depends on ALL of the above

## Final Verification Wave

Before marking work as complete, verify ALL of the following:

1. **TypeScript compilation**: `npx tsc --noEmit` passes in `client/` with zero errors
2. **Server compilation**: Server starts without errors
3. **DeliveryPage unchanged**: Navigate to delivery page, verify all tabs work, age filter works, vehicle columns display, assign vehicle works — NO regressions
4. **WarehousesPage new layout**: Navigate to tồn kho page:
   - Table has vehicle columns with license plate headers
   - Only old orders display (not new ones)
   - Orders grouped by delivery date
   - "Phân xe" button appears on items with remaining > 0
   - "Xác nhận" button appears on old+fully-assigned items (admin only)
   - Click "Xác nhận" → item disappears
   - Mobile responsive cards render correctly
5. **Cross-page consistency**: Assign vehicle on Tồn kho → check DeliveryPage shows it as "Đã giao" correctly
6. **Explicit user approval required**: Do NOT mark work complete until user confirms everything works
