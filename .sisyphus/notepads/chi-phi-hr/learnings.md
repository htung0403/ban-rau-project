Created migration 63_create_expenses.sql following the project's SQL migration pattern. Included RLS policies and app_permissions seeding.
Fixed migration 63_create_expenses.sql to match the exact schema and permissions from the plan. Corrected column names and added missing audit columns.
- Added HR_EXPENSES policy to PAGE_POLICIES in server/src/config/permission-policies.ts
## useHR.ts Expense Hooks
- Added expense hooks: useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useConfirmExpense.
- Updated hrKeys with expenses key.
- Followed TanStack Query pattern with query invalidation on success.
- Added vehicle_id selector to ExpensesPage.tsx using useVehicles hook.
- Refined StatusBadge colors to match the plan: unpaid: 'error', paid: 'success', confirmed: 'pending'.
- Displayed vehicle license plate in both desktop table and mobile card views.
Registered ExpensesPage route in App.tsx after RolePermissionsPage.

## Final Verification Wave - Learnings (2026-04-23)

### Review Findings & Fixes Applied
1. **confirmExpense state guard**: Service method had no check that expense was in 'paid' state before confirming. Fixed - now fetches record and throws if payment_status !== 'paid'.
2. **10-image cap**: Plan constraint C12 required max 10 images. Missing from handleFileChange. Fixed - added guard before upload loop.
3. **useUpdateExpense typing**: payload was typed as ny. Fixed - now uses Parameters<typeof hrApi.updateExpense>[1].
4. **confirmExpense error codes**: Controller returned 500 for all errors. Fixed - now maps to 404/400/500 appropriately.

### Context Mining Results
- **deleteEmployee FK nullify**: expenses table uses ON DELETE CASCADE / SET NULL in DB schema, so no manual nullification needed in deleteEmployee(). Different from tables that use nullable FKs without CASCADE.
- **axiosClient interceptor**: Confirmed the response interceptor unwraps { success, data } -> returns data directly. API type generics like xiosClient.get<Expense[]> are correct.
- **approveSalaryAdvance pattern**: Also relies solely on route middleware (HR_APPROVALS) for auth, no service-level role check. confirmExpense follows same convention.

### Non-Blocking Notes (Accepted)
- Manager role cannot see confirm button in UI (only admin). Backend allows managers via HR_APPROVALS. This is a design choice, not a bug.
- payment_status writeable by users at creation ('unpaid'/'paid') is per plan spec - the form explicitly has toggle buttons for this.
- StatusBadge maps 'confirmed' -> 'pending' variant (blue) which is semantically odd but matches existing StatusBadge API.
- Implemented short-unit conversion in ExpensesPage.tsx: user enters 500, system stores 500,000. View shows 500.
