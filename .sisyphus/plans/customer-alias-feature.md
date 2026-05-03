# Customer Alias Feature

## TL;DR

> **Quick Summary**: Add customer alias/nickname support — store multiple aliases per customer, select an alias when creating import/vegetable orders, display alias on ImportOrdersPage and DeliveryPage "Hàng SG" tab, display main name on "Đã giao" tab. Order merge logic works unchanged (groups by `customers.name`).
> 
> **Deliverables**:
> - Database migration: `aliases TEXT[]` on customers, `selected_alias TEXT` on import_orders + vegetable_orders
> - Customer dialog: alias management UI (add/remove)
> - Order creation dialogs: alias selection dropdown when customer has aliases
> - Display updates: ImportOrdersPage, DeliveryPage (both tabs), PrintDeliveryPage, VegetableImportsPage, VegetablesPage
> - Server API: customer CRUD accepts `aliases`, import/vegetable order CRUD accepts `selected_alias`
> - TDD test suite for all changes
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 (migration+types) → T2 (server API) → T3 (dialogs) → T4 (display logic)

---

## Context

### Original Request
Thêm chức năng Tên phụ (hoặc biệt danh) cho khách hàng. Khi tạo đơn hàng thì có thể chọn các biệt danh và hiển thị biệt danh ở ImportOrdersPage và DeliveryPage tab Hàng SG vẫn sẽ hiển thị biệt danh. Nhưng sau khi xác nhận từ Hàng SG sang Đã giao thì sẽ hiển thị là tên chính, áp dụng gộp đơn hàng nếu thỏa mãn điều kiện.

### Interview Summary
**Key Discussions**:
- **Alias storage**: Multiple aliases per customer (`TEXT[]` array)
- **Order alias**: Stored as `selected_alias` on the order record (snapshot, not dynamic reference)
- **Display logic**: Alias on "Hàng SG", main name on "Đã giao"
- **Merge compatibility**: Merge logic groups by `customers.name` (verified — no changes needed)
- **TDD**: User chose TDD workflow with test infrastructure

**Research Findings**:
- **Name resolution chain**: 3-level fallback across 6+ locations — `customers.name` → `receiver_name` → `profiles.full_name`
- **Merge logic** (`delivery.service.ts:confirmOrders`): Already groups by `customers.name` via `getReceiverName()` — NO changes needed
- **6 Supabase select queries** need `selected_alias` added across `delivery.service.ts` and `import-orders.service.ts`
- **Additional display locations found**: VegetableImportsPage.tsx, VegetablesPage.tsx, PrintDeliveryPage.tsx
- **Both dialogs** (Standard + Vegetable) follow same pattern — both need alias selection

### Metis Review
**Identified Gaps** (addressed):
- **Merge logic**: Verified it already groups by `customers.name`, not alias — no changes needed
- **Additional pages**: Added VegetableImportsPage, VegetablesPage, PrintDeliveryPage to scope
- **`receiver_name` guardrail**: Explicitly must remain main customer name, never set to alias
- **Supabase queries**: All 6 select strings explicitly listed with line numbers
- **Nested types**: `DeliveryOrder.import_orders` and `DeliveryOrder.vegetable_orders` nested types need `selected_alias`

---

## Work Objectives

### Core Objective
Add customer alias management and display across the order lifecycle — from customer creation through order display on all relevant pages.

### Concrete Deliverables
- Migration: `72_add_customer_aliases.sql`
- Updated types in `client/src/types/index.ts`
- Updated server API: customers + import/vegetable orders
- Updated dialogs: AddEditCustomerDialog, AddEditStandardImportOrderDialog, AddEditVegetableImportOrderDialog
- Updated display: ImportOrdersPage, DeliveryPage, PrintDeliveryPage, VegetableImportsPage, VegetablesPage
- TDD test suite

### Definition of Done
- [ ] `bun test` passes with 0 failures
- [ ] `bun run build` succeeds with no TypeScript errors
- [ ] Playwright QA scenarios pass for all display pages

### Must Have
- Aliases stored as `TEXT[]` on customers
- `selected_alias` stored on import_orders AND vegetable_orders
- Alias selection in both order creation dialogs
- Alias display on "Hàng SG" tab, main name on "Đã giao" tab
- Merge logic unchanged and working

### Must NOT Have (Guardrails)
- **MUST NOT** change `receiver_name` to store alias — it must remain the main customer name
- **MUST NOT** modify the merge grouping key logic
- **MUST NOT** add `selected_alias` to `delivery_orders` table
- **MUST NOT** add alias search/filter functionality
- **MUST NOT** add alias column to customer list page
- **MUST NOT** add alias metadata (created_at, is_default, etc.)
- **MUST NOT** create a separate aliases management page

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: bun test (existing)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun REPL) - Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - sequential, blocks all others):
├── Task 1: Database migration + TypeScript types [deep]

Wave 2 (Server API + Customer Dialog - parallel after Wave 1):
├── Task 2: Server API - customer aliases CRUD + import order selected_alias [unspecified-high]
├── Task 3: Customer dialog - alias management UI [visual-engineering]

Wave 3 (Order Dialogs + Display Logic - parallel after Wave 2):
├── Task 4: Order creation dialogs - alias selection dropdown [visual-engineering]
├── Task 5: Display logic - ImportOrdersPage + DeliveryPage + PrintDeliveryPage + Vegetable pages [visual-engineering]

Wave FINAL (4 parallel reviews → user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T4 → T5 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 2 (Waves 2 & 3)
```

### Dependency Matrix

- **T1**: - → T2, T3
- **T2**: T1 → T4
- **T3**: T1 → (independent, no downstream blockers)
- **T4**: T2, T3 → T5
- **T5**: T4 → F1-F4

### Agent Dispatch Summary

- **Wave 1**: **1** - T1 → `deep`
- **Wave 2**: **2** - T2 → `unspecified-high`, T3 → `visual-engineering`
- **Wave 3**: **2** - T4 → `visual-engineering`, T5 → `visual-engineering`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Database Migration + TypeScript Types

  **What to do**:
  - Create migration file `server/database/migrations/72_add_customer_aliases.sql`:
    ```sql
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE public.import_orders ADD COLUMN IF NOT EXISTS selected_alias TEXT;
    ALTER TABLE public.vegetable_orders ADD COLUMN IF NOT EXISTS selected_alias TEXT;
    ```
  - Update `Customer` interface in `client/src/types/index.ts`: add `aliases?: string[]`
  - Update `ImportOrder` interface: add `selected_alias?: string`
  - Update `DeliveryOrder` interface nested types:
    - `import_orders` nested type: add `selected_alias?: string | null`
    - `vegetable_orders` nested type: add `selected_alias?: string | null`
    - `Customer` nested type in `ImportOrder` (line ~218): add `aliases?: string[]`
  - Write TDD tests: Create test file that validates types compile correctly

  **Must NOT do**:
  - Do NOT modify any other database columns
  - Do NOT add metadata fields to aliases (no created_at, is_default, etc.)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding of type propagation across the entire codebase
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Database migration follows Supabase/PostgreSQL patterns
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: Not applicable — this is database/types, not React optimization

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1 — foundation, blocks all others)
  - **Blocks**: T2, T3
  - **Blocked By**: None (can start immediately)

  **References**:
  - `server/database/schema.sql:51-63` - Current customers table definition (add `aliases TEXT[]`)
  - `server/database/schema.sql:66-94` - Current import_orders table (add `selected_alias TEXT`)
  - `server/database/schema.sql:113-139` - Current vegetable_orders table (add `selected_alias TEXT`)
  - `client/src/types/index.ts:159-172` - Customer interface (add `aliases`)
  - `client/src/types/index.ts:200-230` - ImportOrder interface (add `selected_alias`)
  - `client/src/types/index.ts:309-340` - DeliveryOrder interface (nested types need `selected_alias`)
  - `server/database/migrations/` - Existing migration files for numbering pattern

  **Acceptance Criteria**:
  - [ ] Migration file created: `server/database/migrations/72_add_customer_aliases.sql`
  - [ ] `bun test types/customer-alias-types.test.ts` → PASS (types compile, interfaces include new fields)

  **QA Scenarios**:
  ```
  Scenario: Migration adds columns without errors
    Tool: Bash (psql or migration runner)
    Preconditions: Database is running, schema.sql is current
    Steps:
      1. Run migration: psql -f server/database/migrations/72_add_customer_aliases.sql
      2. Verify columns exist: SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'aliases';
      3. Verify: SELECT column_name FROM information_schema.columns WHERE table_name = 'import_orders' AND column_name = 'selected_alias';
      4. Verify: SELECT column_name FROM information_schema.columns WHERE table_name = 'vegetable_orders' AND column_name = 'selected_alias';
    Expected Result: All 3 queries return 1 row each
    Failure Indicators: Column already exists error, or query returns 0 rows
    Evidence: .sisyphus/evidence/task-1-migration-columns.txt

  Scenario: TypeScript types compile without errors
    Tool: Bash (bun)
    Preconditions: Types updated in client/src/types/index.ts
    Steps:
      1. Run: bun run tsc --noEmit --project client/tsconfig.json
    Expected Result: Exit code 0, no TypeScript errors
    Failure Indicators: Any TS error related to Customer, ImportOrder, or DeliveryOrder types
    Evidence: .sisyphus/evidence/task-1-types-compile.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add customer aliases and order selected_alias columns + types`
  - Files: `server/database/migrations/72_add_customer_aliases.sql`, `client/src/types/index.ts`
  - Pre-commit: `bun run tsc --noEmit --project client/tsconfig.json`

- [x] 2. Server API — Customer Aliases CRUD + Import Order selected_alias

  **What to do**:
  - Update `createCustomerSchema` in `server/src/modules/customers/customers.controller.ts`: add `aliases: z.array(z.string()).optional()`
  - Update `updateCustomerSchema`: add `aliases: z.array(z.string()).optional()`
  - Update `CustomerService.create()` to accept and save `aliases`
  - Update `CustomerService.update()` to accept and save `aliases`
  - Update `ImportOrderService.create()` to accept and save `selected_alias` from request body
  - Update `ImportOrderService.update()` to accept and save `selected_alias` from request body
  - Update `VegetableOrderService.create()` and `update()` similarly for `selected_alias`
  - Update ALL Supabase select queries in `delivery.service.ts` to include `selected_alias`:
    - Line ~240 (`getAllToday` method)
    - Lines ~543-544 (`confirmOrders` — source orders)
    - Lines ~652-653 (`confirmOrders` — existing candidates)
  - Update ALL Supabase select queries in `import-orders.service.ts` to include `aliases` on customer joins:
    - Lines ~53-54 (`getAll` method)
    - Line ~128 (`getById` method)
  - Write TDD tests: API tests for customer CRUD with aliases, import order CRUD with selected_alias

  **Must NOT do**:
  - Do NOT change `receiver_name` handling — it must remain the main customer name
  - Do NOT modify the merge grouping logic in `confirmOrders`
  - Do NOT add `selected_alias` to `delivery_orders` table queries

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server-side API changes with multiple service files and query updates
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Express controller/service patterns, Supabase queries, Zod validation
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: Not applicable — this is backend, not React

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3)
  - **Blocks**: T4
  - **Blocked By**: T1

  **References**:
  - `server/src/modules/customers/customers.controller.ts:6-20` - createCustomerSchema and updateCustomerSchema (add aliases)
  - `server/src/modules/customers/customers.service.ts:167-186` - CustomerService.update() (add aliases to payload)
  - `server/src/modules/customers/customers.service.ts:~130-165` - CustomerService.create() (add aliases)
  - `server/src/modules/import-orders/import-orders.service.ts:189-273` - ImportOrderService.create() (add selected_alias)
  - `server/src/modules/import-orders/import-orders.service.ts:275+` - ImportOrderService.update() (add selected_alias)
  - `server/src/modules/delivery/delivery.service.ts:240` - getAllToday select query (add selected_alias)
  - `server/src/modules/delivery/delivery.service.ts:543-544` - confirmOrders source orders select (add selected_alias)
  - `server/src/modules/delivery/delivery.service.ts:652-653` - confirmOrders existing candidates select (add selected_alias)
  - `server/src/modules/import-orders/import-orders.service.ts:53-54` - getAll customer join (add aliases)
  - `server/src/modules/import-orders/import-orders.service.ts:128` - getById customer join (add aliases)

  **Acceptance Criteria**:
  - [ ] `bun test server/__tests__/customers-aliases.test.ts` → PASS (4 tests)
  - [ ] `bun test server/__tests__/import-orders-selected-alias.test.ts` → PASS (3 tests)

  **QA Scenarios**:
  ```
  Scenario: Create customer with aliases via API
    Tool: Bash (curl)
    Preconditions: Server running on port 3000, authenticated
    Steps:
      1. POST /api/customers with body: {"name":"Test Customer","phone":"0901234567","customer_type":"grocery_receiver","aliases":["Chị Lan","Cửa hàng A"]}
      2. Assert response status is 201
      3. Assert response.data.aliases contains ["Chị Lan","Cửa hàng A"]
    Expected Result: Customer created with aliases array intact
    Failure Indicators: 400 error, aliases missing from response, aliases not saved
    Evidence: .sisyphus/evidence/task-2-create-customer-aliases.json

  Scenario: Update customer aliases via API
    Tool: Bash (curl)
    Preconditions: Customer exists with ID from previous scenario
    Steps:
      1. PUT /api/customers/{id} with body: {"aliases":["Chị Lan"]}
      2. Assert response status is 200
      3. Assert response.data.aliases equals ["Chị Lan"]
    Expected Result: Aliases updated to single value
    Failure Indicators: 400 error, aliases not updated
    Evidence: .sisyphus/evidence/task-2-update-customer-aliases.json

  Scenario: Create import order with selected_alias via API
    Tool: Bash (curl)
    Preconditions: Customer exists with aliases, server running
    Steps:
      1. POST /api/import-orders with body including: {"customer_id":"{id}","selected_alias":"Chị Lan","receiver_name":"Test Customer",...}
      2. Assert response status is 201
      3. Assert response.data.selected_alias equals "Chị Lan"
      4. Assert response.data.receiver_name equals "Test Customer" (main name, NOT alias)
    Expected Result: Order created with both selected_alias and receiver_name (main name)
    Failure Indicators: selected_alias not saved, receiver_name set to alias
    Evidence: .sisyphus/evidence/task-2-create-import-order-alias.json

  Scenario: GET import order returns selected_alias
    Tool: Bash (curl)
    Preconditions: Import order exists with selected_alias
    Steps:
      1. GET /api/import-orders/{id}
      2. Assert response.data.selected_alias equals "Chị Lan"
      3. Assert response.data.customers.aliases exists (array)
    Expected Result: Response includes both selected_alias and customer aliases
    Failure Indicators: selected_alias is null/undefined, customer.aliases missing
    Evidence: .sisyphus/evidence/task-2-get-import-order-alias.json

  Scenario: Delivery orders include selected_alias through join
    Tool: Bash (curl)
    Preconditions: Delivery order exists linked to import order with selected_alias
    Steps:
      1. GET /api/delivery/today
      2. Find order with selected_alias
      3. Assert order.import_orders.selected_alias equals "Chị Lan"
    Expected Result: Delivery order response includes selected_alias through import_orders join
    Failure Indicators: selected_alias is undefined in delivery order response
    Evidence: .sisyphus/evidence/task-2-delivery-order-selected-alias.json
  ```

  **Commit**: YES
  - Message: `feat(api): add customer aliases CRUD and import order selected_alias support`
  - Files: `server/src/modules/customers/customers.controller.ts`, `server/src/modules/customers/customers.service.ts`, `server/src/modules/import-orders/import-orders.service.ts`, `server/src/modules/delivery/delivery.service.ts`
  - Pre-commit: `bun test server/__tests__/`

- [x] 3. Customer Dialog — Alias Management UI

  **What to do**:
  - Update `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx`:
    - Add alias management section below existing fields
    - Use dynamic input list: add/remove alias text inputs
    - Each alias input with a remove (X) button
    - "Thêm biệt danh" button to add new alias input
    - Bind aliases to form state via react-hook-form
    - On submit, include `aliases` array in the payload
  - Write TDD tests: Component renders alias inputs, add/remove works, form submits aliases

  **Must NOT do**:
  - Do NOT add alias column to customer list page
  - Do NOT add drag-reorder or alias metadata
  - Do NOT enforce uniqueness across customers

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI component with form inputs and dynamic list management
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: React component patterns, form state management
  - **Skills Evaluated but Omitted**:
    - `backend-node-express-postgresql`: Not applicable — this is frontend only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2)
  - **Blocks**: None (independent)
  - **Blocked By**: T1

  **References**:
  - `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx` - Full file, existing form structure
  - `client/src/hooks/queries/useCustomers.ts` - Customer API hooks (create/update payloads)
  - `client/src/api/customersApi.ts` - API client (should already pass through all fields)

  **Acceptance Criteria**:
  - [ ] `bun test client/__tests__/AddEditCustomerDialog-aliases.test.tsx` → PASS (3 tests)

  **QA Scenarios**:
  ```
  Scenario: Customer dialog shows alias management and saves aliases
    Tool: Playwright (playwright skill)
    Preconditions: Server running, customer page accessible
    Steps:
      1. Navigate to /customers
      2. Click "Thêm khách hàng" button
      3. Fill name: "Test Customer", phone: "0901234567"
      4. Click "Thêm biệt danh" button
      5. Fill first alias input: "Chị Lan"
      6. Click "Thêm biệt danh" again
      7. Fill second alias input: "Cửa hàng A"
      8. Click "Lưu" button
      9. Wait for success toast
      10. Navigate back to customers list, click to edit the customer
      11. Assert both alias inputs show "Chị Lan" and "Cửa hàng A"
    Expected Result: Customer saved with 2 aliases, both visible when editing
    Failure Indicators: Toast error, aliases not saved, only 1 alias visible
    Evidence: .sisyphus/evidence/task-3-customer-dialog-aliases.png

  Scenario: Remove alias from customer dialog
    Tool: Playwright (playwright skill)
    Preconditions: Customer exists with 2 aliases
    Steps:
      1. Navigate to /customers, click edit on customer with aliases
      2. Click X button on first alias input
      3. Assert only 1 alias input remains
      4. Click "Lưu" button
      5. Reload page, edit customer again
      6. Assert only 1 alias is present
    Expected Result: Alias removed and persisted
    Failure Indicators: Both aliases still present after save
    Evidence: .sisyphus/evidence/task-3-remove-alias.png

  Scenario: Customer dialog with no aliases shows clean state
    Tool: Playwright (playwright skill)
    Preconditions: Server running, customer page accessible
    Steps:
      1. Navigate to /customers
      2. Click "Thêm khách hàng"
      3. Assert alias section shows empty state or "Thêm biệt danh" button
      4. Assert no alias inputs are visible by default
    Expected Result: Clean alias section, no pre-filled inputs
    Failure Indicators: Empty alias inputs visible, or alias section missing
    Evidence: .sisyphus/evidence/task-3-no-aliases-state.png
  ```

  **Commit**: YES (groups with T4)
  - Message: `feat(ui): add alias management to customer dialog`
  - Files: `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx`
  - Pre-commit: `bun test client/__tests__/`

- [x] 4. Order Creation Dialogs — Alias Selection Dropdown

  **What to do**:
  - Update `client/src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog.tsx`:
    - When a customer is selected, check if `customer.aliases` exists and has items
    - If aliases exist, show a `SearchableSelect` dropdown below the customer selector
    - Options: first option is main customer name (`{ value: '', label: customer.name }`), then each alias (`{ value: alias, label: alias }`)
    - On alias selection, set form field `selected_alias` to the chosen value
    - On form submit, include `selected_alias` in the payload
    - **CRITICAL**: `receiver_name` must remain the main customer name, NOT the alias
  - Update `client/src/pages/import-orders/dialogs/AddEditVegetableImportOrderDialog.tsx` with the same pattern
  - Write TDD tests: Dialog shows alias dropdown when customer has aliases, selection persists

  **Must NOT do**:
  - Do NOT set `receiver_name` to the alias value
  - Do NOT force alias selection — it must be optional
  - Do NOT show alias dropdown if customer has no aliases

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend form UI with conditional dropdown and state management
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: React form patterns, conditional rendering
  - **Skills Evaluated but Omitted**:
    - `backend-node-express-postgresql`: Not applicable — frontend only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T5)
  - **Blocks**: T5
  - **Blocked By**: T2, T3

  **References**:
  - `client/src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog.tsx:631-637` - SearchableSelect for customer selection
  - `client/src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog.tsx:93` - Sets receiver_name from customer.name (MUST NOT change this)
  - `client/src/pages/import-orders/dialogs/AddEditVegetableImportOrderDialog.tsx:187` - Same pattern for vegetable orders
  - `client/src/components/ui/SearchableSelect.tsx` - Reusable dropdown component

  **Acceptance Criteria**:
  - [ ] `bun test client/__tests__/AddEditStandardImportOrderDialog-alias.test.tsx` → PASS (3 tests)
  - [ ] `bun test client/__tests__/AddEditVegetableImportOrderDialog-alias.test.tsx` → PASS (2 tests)

  **QA Scenarios**:
  ```
  Scenario: Alias dropdown appears when customer has aliases
    Tool: Playwright (playwright skill)
    Preconditions: Customer "Test Customer" exists with aliases ["Chị Lan", "Cửa hàng A"]
    Steps:
      1. Navigate to /import-orders
      2. Click "Thêm đơn nhập" button
      3. Select customer "Test Customer" from dropdown
      4. Wait 300ms for alias dropdown to appear
      5. Assert alias dropdown is visible with 3 options: "Test Customer", "Chị Lan", "Cửa hàng A"
    Expected Result: Alias dropdown appears with main name + all aliases as options
    Failure Indicators: No alias dropdown, wrong options, dropdown appears for customer without aliases
    Evidence: .sisyphus/evidence/task-4-alias-dropdown-visible.png

  Scenario: Selecting alias and creating order persists selected_alias
    Tool: Playwright (playwright skill)
    Preconditions: Customer with aliases exists, import order dialog open
    Steps:
      1. Select customer "Test Customer"
      2. Select alias "Chị Lan" from alias dropdown
      3. Fill remaining required fields (product, quantity, etc.)
      4. Click "Lưu" button
      5. Wait for success toast
      6. Navigate to /api/import-orders/{newOrderId} via curl
      7. Assert response.data.selected_alias equals "Chị Lan"
      8. Assert response.data.receiver_name equals "Test Customer" (main name)
    Expected Result: Order created with selected_alias="Chị Lan" AND receiver_name="Test Customer"
    Failure Indicators: selected_alias is null, receiver_name is "Chị Lan" (wrong!)
    Evidence: .sisyphus/evidence/task-4-order-with-alias.json

  Scenario: No alias dropdown when customer has no aliases
    Tool: Playwright (playwright skill)
    Preconditions: Customer "Plain Customer" exists with no aliases
    Steps:
      1. Navigate to /import-orders
      2. Click "Thêm đơn nhập"
      3. Select customer "Plain Customer"
      4. Wait 500ms
      5. Assert alias dropdown is NOT visible
    Expected Result: No alias dropdown shown
    Failure Indicators: Empty alias dropdown visible
    Evidence: .sisyphus/evidence/task-4-no-alias-dropdown.png

  Scenario: Vegetable order dialog also supports alias selection
    Tool: Playwright (playwright skill)
    Preconditions: Customer with aliases exists
    Steps:
      1. Navigate to vegetable orders page
      2. Click "Thêm đơn nhập" (vegetable)
      3. Select customer with aliases
      4. Assert alias dropdown appears
      5. Select an alias, fill form, submit
      6. Assert order created with selected_alias
    Expected Result: Same alias behavior as standard import orders
    Failure Indicators: No alias dropdown in vegetable dialog
    Evidence: .sisyphus/evidence/task-4-vegetable-alias.png
  ```

  **Commit**: YES (groups with T3)
  - Message: `feat(ui): add alias selection to import and vegetable order dialogs`
  - Files: `client/src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog.tsx`, `client/src/pages/import-orders/dialogs/AddEditVegetableImportOrderDialog.tsx`
  - Pre-commit: `bun test client/__tests__/`

- [x] 5. Display Logic — All Pages (Alias/Main Name Switching)

  **What to do**:
  - Update `client/src/pages/delivery/DeliveryPage.tsx` `getReceiverDisplayName()` function (lines 71-74):
    - If `order.status === 'hang_o_sg'` AND `orderObj.selected_alias` exists → return `selected_alias`
    - Otherwise → return existing fallback chain (`customers.name` → `receiver_name` → `profiles.full_name`)
  - Update `client/src/pages/delivery/PrintDeliveryPage.tsx` `getReceiverDisplayName()` (line ~58-61) with same logic
  - Update `client/src/pages/import-orders/ImportOrdersPage.tsx`:
    - Line ~133: `chuHang` variable — show `selected_alias` if present
    - Line ~149: search matching — include `selected_alias`
    - Line ~464: sender display column — show `selected_alias` if present
    - Line ~503: receiver display column — show `selected_alias` if present
    - Line ~585: mobile card display — show `selected_alias` if present
  - Update `client/src/pages/import-orders/VegetableImportsPage.tsx` `getOrderReceiverName()` (line ~81-85): show `selected_alias` if present
  - Update `client/src/pages/import-orders/VegetablesPage.tsx` `getReceiverName()` (line ~74-77): show `selected_alias` if present
  - Write TDD tests: Display functions return correct name based on status and alias presence

  **Must NOT do**:
  - Do NOT change the data — only the display logic
  - Do NOT modify the merge grouping logic
  - Do NOT add special styling or badges for aliases

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multiple display components with conditional rendering logic
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: Conditional rendering, component display patterns
  - **Skills Evaluated but Omitted**:
    - `backend-node-express-postgresql`: Not applicable — frontend only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T4)
  - **Blocks**: F1-F4
  - **Blocked By**: T4

  **References**:
  - `client/src/pages/delivery/DeliveryPage.tsx:71-74` - getReceiverDisplayName function (add alias logic)
  - `client/src/pages/delivery/DeliveryPage.tsx:543-569` - Tab filtering logic (hang_o_sg vs da_giao)
  - `client/src/pages/delivery/PrintDeliveryPage.tsx:58-61` - getReceiverDisplayName for print page
  - `client/src/pages/import-orders/ImportOrdersPage.tsx:133` - chuHang variable
  - `client/src/pages/import-orders/ImportOrdersPage.tsx:149` - search matching
  - `client/src/pages/import-orders/ImportOrdersPage.tsx:464` - sender display column
  - `client/src/pages/import-orders/ImportOrdersPage.tsx:503` - receiver display column
  - `client/src/pages/import-orders/ImportOrdersPage.tsx:585` - mobile card display
  - `client/src/pages/import-orders/VegetableImportsPage.tsx:81-85` - getOrderReceiverName function
  - `client/src/pages/import-orders/VegetablesPage.tsx:74-77` - getReceiverName function

  **Acceptance Criteria**:
  - [ ] `bun test client/__tests__/display-alias-logic.test.tsx` → PASS (5 tests)

  **QA Scenarios**:
  ```
  Scenario: DeliveryPage "Hàng SG" tab shows alias
    Tool: Playwright (playwright skill)
    Preconditions: Delivery order exists with status='hang_o_sg' and import_orders.selected_alias="Chị Lan"
    Steps:
      1. Navigate to /delivery
      2. Click "Hàng ở SG" tab
      3. Wait for orders to load
      4. Find the order row/card
      5. Assert the receiver name cell displays "Chị Lan" (NOT the main customer name)
    Expected Result: Alias "Chị Lan" is displayed
    Failure Indicators: Main customer name displayed instead of alias
    Evidence: .sisyphus/evidence/task-5-hang-sg-shows-alias.png

  Scenario: DeliveryPage "Đã giao" tab shows main name
    Tool: Playwright (playwright skill)
    Preconditions: Delivery order exists with status='da_giao' and import_orders.selected_alias="Chị Lan"
    Steps:
      1. Navigate to /delivery
      2. Click "Đã giao" tab
      3. Wait for orders to load
      4. Find the order row/card
      5. Assert the receiver name cell displays the main customer name (NOT "Chị Lan")
    Expected Result: Main customer name displayed, alias ignored
    Failure Indicators: Alias "Chị Lan" displayed instead of main name
    Evidence: .sisyphus/evidence/task-5-da-giao-shows-main-name.png

  Scenario: ImportOrdersPage shows alias when present
    Tool: Playwright (playwright skill)
    Preconditions: Import order exists with selected_alias="Chị Lan"
    Steps:
      1. Navigate to /import-orders
      2. Wait for orders to load
      3. Find the order row
      4. Assert the "Chủ hàng" column displays "Chị Lan"
    Expected Result: Alias displayed in import orders list
    Failure Indicators: Main customer name displayed
    Evidence: .sisyphus/evidence/task-5-import-orders-shows-alias.png

  Scenario: ImportOrdersPage shows main name when no alias
    Tool: Playwright (playwright skill)
    Preconditions: Import order exists with selected_alias=null
    Steps:
      1. Navigate to /import-orders
      2. Wait for orders to load
      3. Find the order row
      4. Assert the "Chủ hàng" column displays the main customer name
    Expected Result: Main customer name displayed
    Failure Indicators: Empty or "-" displayed
    Evidence: .sisyphus/evidence/task-5-import-orders-no-alias.png

  Scenario: Merge logic still works with different aliases
    Tool: Bash (curl) + Playwright
    Preconditions: Two import orders exist with same customer but different selected_alias values
    Steps:
      1. Create delivery orders from both import orders (via existing flow)
      2. Navigate to /delivery, "Hàng ở SG" tab
      3. Click "Xác nhận tất cả" (or confirm via curl: PUT /api/delivery/confirm with both IDs)
      4. Assert response shows merged order
      5. Navigate to "Cần giao" tab
      6. Assert only ONE order exists (merged) with total_quantity = sum of both
    Expected Result: Orders merged correctly despite different aliases
    Failure Indicators: Two separate orders still visible, merge failed
    Evidence: .sisyphus/evidence/task-5-merge-with-aliases.png
  ```

  **Commit**: YES
  - Message: `feat(ui): display customer alias on order pages with status-based switching`
  - Files: `client/src/pages/delivery/DeliveryPage.tsx`, `client/src/pages/delivery/PrintDeliveryPage.tsx`, `client/src/pages/import-orders/ImportOrdersPage.tsx`, `client/src/pages/import-orders/VegetableImportsPage.tsx`, `client/src/pages/import-orders/VegetablesPage.tsx`
  - Pre-commit: `bun test client/__tests__/`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [7/7] | Must NOT Have [7/7] | Tasks [5/5] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
- [x] F3. **Real Manual QA** — `unspecified-high`
- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **T1**: `feat(db): add customer aliases and order selected_alias columns + types` — `server/database/migrations/72_add_customer_aliases.sql`, `client/src/types/index.ts`
- **T2**: `feat(api): add customer aliases CRUD and import order selected_alias support` — `server/src/modules/customers/*`, `server/src/modules/import-orders/*`, `server/src/modules/delivery/delivery.service.ts`
- **T3+T4**: `feat(ui): add alias management to customer dialog and alias selection to order dialogs` — `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx`, `client/src/pages/import-orders/dialogs/AddEditStandardImportOrderDialog.tsx`, `client/src/pages/import-orders/dialogs/AddEditVegetableImportOrderDialog.tsx`
- **T5**: `feat(ui): display customer alias on order pages with status-based switching` — `client/src/pages/delivery/DeliveryPage.tsx`, `client/src/pages/delivery/PrintDeliveryPage.tsx`, `client/src/pages/import-orders/ImportOrdersPage.tsx`, `client/src/pages/import-orders/VegetableImportsPage.tsx`, `client/src/pages/import-orders/VegetablesPage.tsx`

---

## Success Criteria

### Verification Commands
```bash
bun run tsc --noEmit --project client/tsconfig.json  # Expected: no errors
bun test  # Expected: all tests pass, 0 failures
bun run build  # Expected: successful build
```

### Final Checklist
- [ ] All "Must Have" present (aliases TEXT[], selected_alias on orders, alias selection in dialogs, display switching, merge unchanged)
- [ ] All "Must NOT Have" absent (no receiver_name=alias, no merge logic changes, no delivery_orders.selected_alias, no alias search/filter, no alias column in customer list, no alias metadata, no separate alias page)
- [ ] All tests pass (TDD: 17+ tests across 5 test files)
- [ ] All QA scenarios pass (18 scenarios across 5 tasks)
- [ ] Evidence files captured for all scenarios
