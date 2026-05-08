# Customer Merge Feature — Gộp Khách Hàng

## TL;DR

> **Quick Summary**: Add a secure, atomic customer merge feature that transfers all orders, receipts, debt ledger entries, and payment collections from one customer (source) to another (target), adds the source name as an alias, soft-deletes the source, and supports undo via a merge log.
>
> **Deliverables**:
> - 3 DB migrations: merge log table, atomic merge RPC, undo RPC
> - 2 API endpoints: `POST /api/customers/merge`, `POST /api/customers/merge/undo/:mergeId`
> - 1 new permission policy: `MERGE_CUSTOMERS`
> - 1 React dialog: `MergeCustomerDialog`
> - Merge actions on customer list + detail pages
> - TDD test suite (Bun + Vitest)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Tasks 2-3-4 → Tasks 5-6-7 → Tasks 8-9-10-11-12 → Tasks 13-14 → FINAL

---

## Context

### Original Request
Thêm chức năng "chuyển khách hàng thành biệt danh của khách hàng khác và chuyển các đơn sang" — merge Customer B into Customer A, B's name becomes an alias of A, all orders transfer to A.

### Interview Summary
**Key Discussions**:
- **Post-merge handling**: Soft-delete source customer (set `deleted_at`). Not hard-delete.
- **Stats**: Recalculate `total_orders`, `total_revenue`, `debt` from actual order/ledger data (not simple addition).
- **Undo**: YES — merge log table enables rollback via dedicated undo endpoint.
- **Permission**: Admin + Manager only — new `MERGE_CUSTOMERS` policy.
- **user_id**: Transfer to target if target doesn't have one; if both have, unlink source.
- **UI**: Both dashboard bulk action + detail page dialog.
- **Test strategy**: TDD — write failing tests first, then implement.

**Research Findings**:
- Project uses Supabase RPC functions for atomic operations (see `handle_customer_payment_fifo_atomic` pattern in `schema.sql` lines 383-471).
- `customer_debt_ledger` table has triggers that auto-sync to `customers.debt` — simply updating `customer_id` on ledger entries does NOT transfer debt (trigger is a no-op when amount unchanged).
- Tables referencing `customers.id` via FK: `import_orders.customer_id`, `vegetable_orders.customer_id`, `export_orders.customer_id`, `receipts.customer_id`, `payment_collections.customer_id`, `customer_debt_ledger.customer_id` — **6 FK columns** across 6 tables must be updated during merge.
- `import_orders` and `vegetable_orders` also have `sender_name VARCHAR(255)` — a plain text field, NOT a FK. This does NOT need updating during merge.
- `payment_collections` references `customers.id` directly — must be updated during merge.
- `customers.user_id` has a UNIQUE constraint — transfer logic must handle conflicts.

### Metis Review
**Identified Gaps** (addressed):
- **`customer_debt_ledger` table**: Now handled explicitly — use DELETE+INSERT strategy so triggers properly adjust both customers' debt.
- **Debt trigger no-op on UPDATE**: Resolved by using DELETE old entries + INSERT new entries instead of UPDATE.
- **Concurrent merge race condition**: Resolved with `pg_advisory_xact_lock` in RPC function.
- **`user_id` UNIQUE constraint conflict**: Resolved — if both have user_id, unlink source (set to NULL).
- **`selected_alias` on transferred orders**: After merge, validate and add missing aliases to target's aliases array.
- **Permission mechanism**: `requirePolicy` maps to page paths, not roles directly. Admin is auto-allowed. For strict manager-only gating, use `requireRolesOnly('admin', 'manager')`.

---

## Work Objectives

### Core Objective
Implement an atomic, auditable customer merge feature with PostgreSQL-level transaction guarantees, full undo support, and TDD verification.

### Concrete Deliverables
- `server/database/migrations/73_create_customer_merges_table.sql`
- `server/database/migrations/74_create_merge_rpc_function.sql`
- `server/database/migrations/75_create_undo_merge_rpc_function.sql`
- `server/src/modules/customers/customers.routes.ts` (updated)
- `server/src/modules/customers/customers.controller.ts` (updated)
- `server/src/modules/customers/customers.service.ts` (updated)
- `server/src/config/permission-policies.ts` (updated)
- `client/src/api/customersApi.ts` (updated)
- `client/src/hooks/queries/useCustomers.ts` (updated)
- `client/src/pages/customers/dialogs/MergeCustomerDialog.tsx` (new)
- `client/src/pages/customers/GroceryCustomersPage.tsx` (updated)
- `client/src/pages/customers/CustomerDetailPage.tsx` (updated)
- `server/__tests__/customers-merge.test.ts` (new)
- `server/__tests__/customers-merge-undo.test.ts` (new)

### Definition of Done
- [ ] `POST /api/customers/merge` returns 200 with merge record for valid merge
- [ ] `POST /api/customers/merge/undo/:mergeId` returns 200 with restored state
- [ ] All 6 FK columns across 6 tables updated correctly (verified by SQL assertions)
- [ ] Source customer soft-deleted, target customer's `aliases` includes source name
- [ ] Debt recalculated from ledger SUM, not simple addition
- [ ] `bun test server/__tests__/customers-merge.test.ts` → ALL PASS
- [ ] `bun test server/__tests__/customers-merge-undo.test.ts` → ALL PASS
- [ ] Merge dialog in UI works end-to-end
- [ ] TDD cycle complete: RED → GREEN → REFACTOR for each implementation unit

### Must Have
- Atomic PostgreSQL transaction for merge (all-or-nothing)
- Advisory lock to prevent concurrent merges on same customers
- Undo capability via merge log with JSONB snapshot
- Admin/Manager-only permission gating
- Same `customer_type` validation (reject cross-type merge)
- Self-merge rejection (source_id = target_id)
- Already-deleted customer rejection
- `customer_debt_ledger` entries properly transferred (DELETE+INSERT, not UPDATE)

### Must NOT Have (Guardrails)
- No bulk merge (multiple sources into one target) — only 1:1
- No merge history/audit page — just the undo endpoint
- No modification to existing debt calculation triggers
- No new UI components from scratch — reuse existing dialog patterns
- No notification/email system for merge events
- No modification to `normalizeEntityNameKey` duplicate check
- No merge across different `customer_type` values
- No simple addition for `debt`/`total_orders`/`total_revenue` — must recalculate from actual data

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Bun for server, Vitest for client)
- **Automated tests**: TDD — RED (failing test) → GREEN (minimal impl) → REFACTOR
- **Framework**: Bun test (server), Vitest (client)
- **If TDD**: Each task follows RED → GREEN → REFACTOR cycle

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Database**: Use Bash (psql or Supabase JS) — Run SQL queries, assert results
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — DB foundation + types + permissions):
├── Task 1: Migration 73 — customer_merges table [quick]
├── Task 2: Migration 74 — merge_customers_atomic RPC [deep]
├── Task 3: Migration 75 — undo_customer_merge RPC [deep]
├── Task 4: Add MERGE_CUSTOMERS permission policy [quick]

Wave 2 (After Wave 1 — TDD backend, MAX PARALLEL):
├── Task 5: Backend merge API — route + controller + service [deep]
├── Task 6: Backend undo API — route + controller + service [deep]
├── Task 7: Server integration tests for merge RPC [unspecified-high]
├── Task 8: Server integration tests for undo RPC [unspecified-high]

Wave 3 (After Wave 2 — frontend + client tests):
├── Task 9: Client API + React Query hooks for merge/undo [quick]
├── Task 10: MergeCustomerDialog component [visual-engineering]
├── Task 11: Merge action on customer list page [visual-engineering]
├── Task 12: Merge action on customer detail page [visual-engineering]
├── Task 13: Client integration tests (Vitest + Playwright) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high + playwright)
├── Task F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay

Critical Path: Task 1 → Tasks 2-3-4 (parallel) → Tasks 5-6-7-8 (parallel) → Tasks 9-10-11-12-13 (parallel) → FINAL
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 2 & 3)
```

### Dependency Matrix

- **1**: — | 2-4 | None
- **2**: 1 | 5, 7 | Wave 1
- **3**: 1 | 6, 8 | Wave 1
- **4**: — | 5-6 | Wave 1
- **5**: 2, 4 | 9, 10, 12 | Wave 2
- **6**: 3, 4 | 9 | Wave 2
- **7**: 2 | — | Wave 2
- **8**: 3 | — | Wave 2
- **9**: 5, 6 | 10-12 | Wave 3
- **10**: 9 | 11, 12 | Wave 3
- **11**: 9, 10 | — | Wave 3
- **12**: 9, 10 | — | Wave 3
- **13**: 10, 11, 12 | — | Wave 3

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 → `quick`, T2 → `deep`, T3 → `deep`, T4 → `quick`
- **Wave 2**: **4** — T5 → `deep`, T6 → `deep`, T7 → `unspecified-high`, T8 → `unspecified-high`
- **Wave 3**: **5** — T9 → `quick`, T10 → `visual-engineering`, T11 → `visual-engineering`, T12 → `visual-engineering`, T13 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

### Wave 1 — Foundation (DB + Permissions)

- [x] 1. Migration 73 — Create `customer_merges` table

  **What to do**:
  - Create file `server/database/migrations/73_create_customer_merges_table.sql`
  - Table columns:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `source_id UUID NOT NULL REFERENCES public.customers(id)`
    - `target_id UUID NOT NULL REFERENCES public.customers(id)`
    - `source_name VARCHAR(255) NOT NULL` — denormalized for audit trail
    - `source_data JSONB NOT NULL` — full snapshot of source customer before merge (all fields)
    - `affected_order_ids JSONB NOT NULL DEFAULT '[]'::JSONB` — list of {table, id} for undo
    - `merged_by UUID NOT NULL REFERENCES public.profiles(id)`
    - `merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `undone_at TIMESTAMPTZ` — NULL until undone
    - `undone_by UUID REFERENCES public.profiles(id)`
    - `notes TEXT`
  - Add indexes: `idx_customer_merges_source`, `idx_customer_merges_target`, `idx_customer_merges_merged_at`
  - Add constraint: `CONSTRAINT chk_no_self_merge CHECK (source_id != target_id)`

  **Must NOT do**:
  - Don't add RLS policies (merges are service-only, not user-facing)
  - Don't add triggers on this table

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file SQL migration with well-defined schema — straightforward DDL
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Domain overlap — PostgreSQL + Supabase patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3 (RPC functions reference this table)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `server/database/schema.sql:347-356` — `receipts` table pattern (same UUID PK + timestamps + FK to profiles)
  - `server/database/migrations/72_add_customer_aliases.sql` — Migration file naming and SQL style conventions
  - `server/database/schema.sql:51-63` — `customers` table schema (columns to snapshot in `source_data`)

  **Acceptance Criteria**:
  - [ ] Migration file exists at `server/database/migrations/73_create_customer_merges_table.sql`
  - [ ] SQL syntax valid (no errors on execute)
  - [ ] All columns present with correct types and constraints
  - [ ] Indexes created correctly

  **QA Scenarios**:
  ```
  Scenario: Table created successfully with all columns
    Tool: Bash (psql or bun run)
    Preconditions: Database is running, schema matches current state
    Steps:
      1. Run migration: apply the SQL file to the database
      2. Query: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_merges' ORDER BY ordinal_position
      3. Assert: 10 columns returned (id, source_id, target_id, source_name, source_data, affected_order_ids, merged_by, merged_at, undone_at, undone_by, notes)
      4. Assert: source_id has NOT NULL constraint
      5. Assert: target_id has NOT NULL constraint
      6. Query: SELECT indexname FROM pg_indexes WHERE tablename = 'customer_merges'
      7. Assert: At least 3 indexes exist (source, target, merged_at)
    Expected Result: Table exists with all columns, constraints, and indexes
    Failure Indicators: Missing columns, missing FK constraints, missing indexes
    Evidence: .sisyphus/evidence/task-1-table-created.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add customer_merges table for merge audit trail`
  - Files: `server/database/migrations/73_create_customer_merges_table.sql`

### Wave 2 — TDD Backend (API + Tests)

- [x] 5. Backend merge API — route + controller + service (TDD: RED first)

  **What to do**:
  **RED (test first)**:
  - Create `server/__tests__/customers-merge.test.ts` with failing test cases:
    - `POST /api/customers/merge` with valid source/target returns 200 + merge record
    - `POST /api/customers/merge` with missing source_id returns 400 validation error
    - `POST /api/customers/merge` with self-merge returns 400
    - `POST /api/customers/merge` without auth returns 401
    - `POST /api/customers/merge` as staff returns 403
  - Run tests → verify they FAIL (RED)

  **GREEN (implement)**:
  - Add Zod schema `mergeCustomerSchema` to `customers.controller.ts`:
    ```typescript
    const mergeCustomerSchema = z.object({
      source_id: z.string().uuid(),
      target_id: z.string().uuid(),
    });
    ```
  - Add `CustomerController.merge` method that:
    - Validates with `mergeCustomerSchema`
    - Calls `CustomerService.merge(validated.source_id, validated.target_id, req.user!.id)`
    - Returns 200 with merge record
    - Catches errors and returns 400
  - Add `CustomerService.merge` method that:
    - Calls `supabaseService.rpc('merge_customers_atomic', { p_source_id, p_target_id, p_merged_by })`
    - Returns the JSONB result
  - Add route in `customers.routes.ts`:
    ```typescript
    router.post('/merge', requireRolesOnly('admin', 'manager'), CustomerController.merge);
    ```
  - Run tests → verify they PASS (GREEN)

  **REFACTOR**:
  - Review error handling for consistency with existing controllers
  - Ensure error messages are in Vietnamese where appropriate

  **Must NOT do**:
  - Don't implement the merge logic in the service — delegate entirely to the RPC function
  - Don't add the undo route here — separate task
  - Don't skip the TDD RED phase

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-layer implementation (test → controller → service → route) with TDD discipline
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Express.js + TypeScript + Supabase patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential with Task 6 — shared files)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8 but Task 5 and 6 share controller/service files)
  - **Blocks**: Tasks 9, 10, 12 (frontend depends on API)
  - **Blocked By**: Tasks 2, 4 (RPC function + permission policy)

  **References**:
  - `server/src/modules/customers/customers.controller.ts:148-156` — `create` method pattern (Zod validation → service call → response)
  - `server/src/modules/customers/customers.controller.ts:6-13` — `createCustomerSchema` Zod pattern
  - `server/src/modules/customers/customers.service.ts:199-220` — `updateDebtPayment` pattern (RPC call with `supabaseService.rpc()`)
  - `server/src/modules/customers/customers.routes.ts:16-19` — Route registration pattern with `requirePolicy`
  - `server/__tests__/customers-aliases.test.ts` — Test file structure and style conventions
  - `server/src/utils/response.ts` — `successResponse` and `errorResponse` function signatures

  **Acceptance Criteria**:
  - [ ] `mergeCustomerSchema` Zod validation defined
  - [ ] `POST /api/customers/merge` returns 200 for valid merge
  - [ ] `POST /api/customers/merge` returns 400 for invalid input
  - [ ] `POST /api/customers/merge` returns 401 without auth
  - [ ] `POST /api/customers/merge` returns 403 for unauthorized roles
  - [ ] All RED tests now PASS (GREEN)
  - [ ] `bun test server/__tests__/customers-merge.test.ts` → ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Happy path — merge two customers successfully
    Tool: Bash (curl)
    Preconditions: Two test customers of same type exist, admin JWT token available
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" -d '{"source_id":"<src>","target_id":"<tgt>"}'
      2. Assert: HTTP 200
      3. Assert: response.data.id is UUID
      4. Assert: response.data.source_id = "<src>"
      5. Assert: response.data.target_id = "<tgt>"
      6. Assert: response.message is defined
    Expected Result: 200 with merge record in response body
    Evidence: .sisyphus/evidence/task-5-merge-api-success.txt

  Scenario: Invalid — missing source_id
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" -d '{"target_id":"<tgt>"}'
      2. Assert: HTTP 400
      3. Assert: response.error contains "source_id"
    Expected Result: 400 validation error
    Evidence: .sisyphus/evidence/task-5-merge-api-validation.txt

  Scenario: Unauthorized — no token
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge -H "Content-Type: application/json" -d '{"source_id":"<src>","target_id":"<tgt>"}'
      2. Assert: HTTP 401
    Expected Result: 401 Unauthorized
    Evidence: .sisyphus/evidence/task-5-merge-api-unauth.txt
  ```

  **Commit**: YES (after GREEN)
  - Message: `feat(api): add POST /api/customers/merge endpoint`
  - Files: `server/src/modules/customers/customers.controller.ts`, `server/src/modules/customers/customers.service.ts`, `server/src/modules/customers/customers.routes.ts`, `server/__tests__/customers-merge.test.ts`
  - Pre-commit: `bun test server/__tests__/customers-merge.test.ts`

- [x] 6. Backend undo API — route + controller + service (TDD: RED first)

  **What to do**:
  **RED (test first)**:
  - Create `server/__tests__/customers-merge-undo.test.ts` with failing test cases:
    - `POST /api/customers/merge/undo/:mergeId` restores data and returns 200
    - `POST /api/customers/merge/undo/:mergeId` with invalid UUID returns 400
    - `POST /api/customers/merge/undo/:mergeId` without auth returns 401
    - `POST /api/customers/merge/undo/:mergeId` as staff returns 403
    - `POST /api/customers/merge/undo/:mergeId` on already-undone merge returns 400
  - Run tests → verify they FAIL

  **GREEN (implement)**:
  - Add `CustomerController.undoMerge` method:
    - Validates `req.params.mergeId` is UUID
    - Calls `CustomerService.undoMerge(req.params.mergeId, req.user!.id)`
    - Returns 200 with undo confirmation
  - Add `CustomerService.undoMerge` method:
    - Calls `supabaseService.rpc('undo_customer_merge', { p_merge_id, p_undone_by })`
  - Add route in `customers.routes.ts`:
    ```typescript
    router.post('/merge/undo/:mergeId', requireRolesOnly('admin', 'manager'), CustomerController.undoMerge);
    ```
  - Run tests → verify they PASS

  **Must NOT do**:
  - Don't implement undo logic in service — delegate to RPC
  - Don't skip TDD RED phase

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Similar pattern to merge API but with path parameter validation
  - **Skills**: [`backend-node-express-postgresql`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (shares controller/service files with Task 5)
  - **Parallel Group**: Wave 2 (after Task 5 completes)
  - **Blocks**: Task 9 (frontend hooks depend on both APIs)
  - **Blocked By**: Tasks 3, 4, 5 (undo RPC + permissions + merge API files)

  **References**:
  - `server/src/modules/customers/customers.controller.ts:94-101` — `getById` pattern (path parameter: `req.params.id`)
  - `server/src/modules/customers/customers.routes.ts:28-32` — Route with path parameter pattern
  - `server/__tests__/customers-merge.test.ts` — Test patterns from Task 5 (consistency)

  **Acceptance Criteria**:
  - [ ] `POST /api/customers/merge/undo/:mergeId` returns 200 on successful undo
  - [ ] Returns 400 for invalid UUID or already-undone merge
  - [ ] Returns 401 without auth
  - [ ] Returns 403 for unauthorized roles
  - [ ] `bun test server/__tests__/customers-merge-undo.test.ts` → ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Happy path — undo a merge
    Tool: Bash (curl)
    Preconditions: A merge has been performed, merge_id is known
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge/undo/<merge_id> -H "Authorization: Bearer <admin_token>"
      2. Assert: HTTP 200
      3. Assert: response.data.success = true
    Expected Result: 200 with undo confirmation
    Evidence: .sisyphus/evidence/task-6-undo-api-success.txt

  Scenario: Invalid — already undone merge
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge/undo/<already_undone_id> -H "Authorization: Bearer <admin_token>"
      2. Assert: HTTP 400
      3. Assert: response.error contains "already" or "undone"
    Expected Result: 400 error
    Evidence: .sisyphus/evidence/task-6-undo-api-already.txt
  ```

  **Commit**: YES (after GREEN)
  - Message: `feat(api): add POST /api/customers/merge/undo/:mergeId endpoint`
  - Files: Same controller/service/routes files as Task 5, plus `server/__tests__/customers-merge-undo.test.ts`
  - Pre-commit: `bun test server/__tests__/customers-merge-undo.test.ts`

- [x] 7. Server integration tests — merge RPC behavior verification

  **What to do**:
  - Extend `server/__tests__/customers-merge.test.ts` with integration tests that exercise the RPC directly:
    - Test all FK column updates (customer_id on import_orders, vegetable_orders, export_orders, receipts, payment_collections, customer_debt_ledger)
    - Test debt ledger transfer correctness (DELETE old + INSERT new = triggers handle debt)
    - Test stats recalculation accuracy (compare SUM queries with customer fields)
    - Test source name in target aliases (no duplicates)
    - Test is_loyal merge (TRUE if either was loyal)
    - Test user_id transfer (when target has none, when both have)
    - Test selected_alias sync on transferred orders
  - Each test: set up seed data → call RPC → assert database state
  - These are WHITE-BOX tests that verify the RPC internals work correctly

  **Must NOT do**:
  - Don't test the HTTP layer (that's Task 5's concern) — test the RPC directly

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Thorough white-box testing requiring deep understanding of RPC internals and all FK relationships
  - **Skills**: [`backend-node-express-postgresql`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8 — different test files, different RPC functions)
  - **Parallel Group**: Wave 2
  - **Blocks**: None (no tasks depend on tests)
  - **Blocked By**: Task 2 (merge RPC must exist)

  **References**:
  - `server/database/migrations/74_create_merge_rpc_function.sql` — The function being tested
  - `server/__tests__/customers-aliases.test.ts` — Test structure and assertion style
  - `server/__tests__/import-orders-selected-alias.test.ts` — Related test for order-level operations

  **Acceptance Criteria**:
  - [ ] Tests cover ALL 6 FK column updates (import_orders.customer_id, vegetable_orders.customer_id, export_orders.customer_id, receipts.customer_id, payment_collections.customer_id, customer_debt_ledger.customer_id)
  - [ ] Tests verify customer_debt_ledger transfer (DELETE+INSERT, not UPDATE)
  - [ ] Tests verify stats recalculation accuracy
  - [ ] Tests verify aliases merge without duplicates
  - [ ] Tests verify is_loyal merge logic
  - [ ] Tests verify user_id handling
  - [ ] `bun test server/__tests__/customers-merge.test.ts` → ALL PASS

  **QA Scenarios**:
  ```
  Scenario: All FK columns updated correctly
    Tool: Bash (bun test)
    Preconditions: Seed data with source customer referenced in all 7 FK columns
    Steps:
      1. Run: bun test server/__tests__/customers-merge.test.ts --test-name-pattern="FK"
      2. Assert: All assertions pass — no source_id remains in any FK column
    Expected Result: All tests pass with zero source_id references remaining
    Evidence: .sisyphus/evidence/task-7-fk-verification.txt

  Scenario: Debt ledger transfer correctness
    Tool: Bash (bun test)
    Steps:
      1. Run: bun test server/__tests__/customers-merge.test.ts --test-name-pattern="ledger"
      2. Assert: Source customer has 0 ledger entries, target has original_target_count + original_source_count
      3. Assert: target.debt = SUM(customer_debt_ledger.amount WHERE customer_id = target_id)
    Expected Result: Debt correctly transferred via DELETE+INSERT
    Evidence: .sisyphus/evidence/task-7-ledger-transfer.txt
  ```

  **Commit**: YES
  - Message: `test(server): add integration tests for merge RPC behavior`
  - Files: `server/__tests__/customers-merge.test.ts`
  - Pre-commit: `bun test server/__tests__/customers-merge.test.ts`

- [x] 8. Server integration tests — undo RPC behavior verification

  **What to do**:
  - Extend `server/__tests__/customers-merge-undo.test.ts` with integration tests:
    - Test undo restores ALL FK references back to source
    - Test undo restores customer_debt_ledger entries
    - Test undo restores source customer data (user_id, stats, is_loyal)
    - Test undo removes source name from target aliases
    - Test undo recalculates BOTH customers' stats correctly
    - Test undo marks merge log as undone
    - Test double-undo is rejected
    - Test undo of non-existent merge ID is rejected

  **Must NOT do**:
  - Don't test the HTTP layer — test the RPC directly

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-node-express-postgresql`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 3 (undo RPC must exist)

  **References**:
  - `server/database/migrations/75_create_undo_merge_rpc_function.sql` — The function being tested
  - `server/__tests__/customers-merge.test.ts` — Consistent test patterns

  **Acceptance Criteria**:
  - [ ] Tests verify undo restores all data to pre-merge state
  - [ ] Tests verify double-undo rejection
  - [ ] `bun test server/__tests__/customers-merge-undo.test.ts` → ALL PASS

  **QA Scenarios**:
  ```
  Scenario: Undo restores complete state
    Tool: Bash (bun test)
    Steps:
      1. Run: bun test server/__tests__/customers-merge-undo.test.ts --test-name-pattern="restore"
      2. Assert: All FK references back to source, source not soft-deleted, stats correct
    Expected Result: Pre-merge state fully restored
    Evidence: .sisyphus/evidence/task-8-undo-restore.txt
  ```

  **Commit**: YES
  - Message: `test(server): add integration tests for undo RPC behavior`
  - Files: `server/__tests__/customers-merge-undo.test.ts`
  - Pre-commit: `bun test server/__tests__/customers-merge-undo.test.ts`

### Wave 3 — Frontend (API + UI + Tests)

- [x] 9. Client API + React Query hooks for merge/undo

  **What to do**:
  - Add to `client/src/api/customersApi.ts`:
    ```typescript
    merge: async (payload: { source_id: string; target_id: string }) => {
      const { data } = await axiosClient.post('/customers/merge', payload);
      return data;
    },
    undoMerge: async (mergeId: string) => {
      const { data } = await axiosClient.post(`/customers/merge/undo/${mergeId}`);
      return data;
    },
    ```
  - Add to `client/src/hooks/queries/useCustomers.ts`:
    - `useMergeCustomers()` — `useMutation` calling `customersApi.merge` with `onSuccess` invalidating customer queries
    - `useUndoMerge()` — `useMutation` calling `customersApi.undoMerge` with `onSuccess` invalidating customer queries
  - Both mutations should invalidate: `['customers']`, `['customer', id]` to refresh lists and detail views

  **Must NOT do**:
  - Don't create new API file — add to existing `customersApi.ts`
  - Don't create new hooks file — add to existing `useCustomers.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple API method + hook additions following established patterns
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: React Query mutation patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (Tasks 10-12 depend on hooks being available)
  - **Parallel Group**: Wave 3 (first task in wave)
  - **Blocks**: Tasks 10, 11, 12 (UI components consume these hooks)
  - **Blocked By**: Tasks 5, 6 (API endpoints must exist)

  **References**:
  - `client/src/api/customersApi.ts:10-13` — `create` method pattern (POST with payload)
  - `client/src/api/customersApi.ts:70-73` — `bulkSetLoyal` pattern (PUT returning data)
  - `client/src/hooks/queries/useCustomers.ts:64-74` — `useCreateCustomer` mutation pattern (useMutation, invalidateQueries)
  - `client/src/hooks/queries/useCustomers.ts:95-105` — `useDeleteCustomer` mutation pattern (onSuccess with invalidation)

  **Acceptance Criteria**:
  - [ ] `customersApi.merge` calls `POST /customers/merge` with correct payload
  - [ ] `customersApi.undoMerge` calls `POST /customers/merge/undo/:mergeId`
  - [ ] `useMergeCustomers` invalidates customer caches on success
  - [ ] `useUndoMerge` invalidates customer caches on success

  **QA Scenarios**:
  ```
  Scenario: merge API call sends correct payload
    Tool: Bash (bun/node REPL)
    Steps:
      1. Import customersApi from the module
      2. Call: customersApi.merge({ source_id: 'uuid-a', target_id: 'uuid-b' })
      3. Verify: POST request to /customers/merge with JSON body {source_id: 'uuid-a', target_id: 'uuid-b'}
    Expected Result: Correct API call
    Evidence: .sisyphus/evidence/task-9-api-call.txt
  ```

  **Commit**: YES
  - Message: `feat(client): add merge/undo API methods and React Query hooks`
  - Files: `client/src/api/customersApi.ts`, `client/src/hooks/queries/useCustomers.ts`

- [x] 10. MergeCustomerDialog component

  **What to do**:
  - Create `client/src/pages/customers/dialogs/MergeCustomerDialog.tsx`
  - Follow dialog patterns from `AddEditCustomerDialog.tsx` and `CollectDebtDialog.tsx`:
    - Props: `isOpen`, `isClosing`, `onClose`, `sourceCustomer` (the customer being merged away)
    - Animated overlay with `animate-in fade-in` classes
    - Step-by-step flow:
      1. **Step 1**: Show source customer info (cannot change — display only)
      2. **Step 2**: Search/select target customer (dropdown or search input filtering customers of same type)
      3. **Step 3**: Confirmation summary showing what will happen:
         - "All N orders will be transferred to [target name]"
         - "Source customer will be deleted"
         - "Source name will become an alias of target"
      4. **Step 4**: Final confirm button with variant="danger" styling
    - Loading state during merge mutation
    - Success state with link to target customer detail
    - Error state with retry option
  - Use `useMergeCustomers` hook
  - Close dialog on success with callback (to trigger page refresh)

  **Must NOT do**:
  - Don't build from scratch — copy dialog structure from `CollectDebtDialog.tsx` (`isClosing` animation, overlay, card container)
  - Don't allow merging across different customer types in the UI
  - Don't implement undo in this dialog — that's a separate concern

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with multi-step flow, animations, search, loading/error/success states
  - **Skills**: [`vercel-react-best-practices`, `frontend-ui-ux`]
    - `vercel-react-best-practices`: React patterns, state management
    - `frontend-ui-ux`: Dialog UX, step-by-step flow, visual polish

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12 after Task 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: None directly (can be built independently)
  - **Blocked By**: Task 9 (hooks must exist)

  **References**:
  - `client/src/pages/customers/dialogs/CollectDebtDialog.tsx` — Dialog pattern (isOpen/isClosing/animation/overlay/card structure)
  - `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx` — Form dialog pattern with customer type handling
  - `client/src/pages/customers/GroceryCustomersPage.tsx:95-103` — Customer search/filter pattern (`matchesSearch`, sorting)
  - `client/src/components/shared/ConfirmDialog.tsx` — Confirmation dialog pattern (variant="danger")
  - `client/src/components/shared/LoadingSkeleton.tsx` — Loading state component
  - `client/src/components/shared/ErrorState.tsx` — Error state component

  **Acceptance Criteria**:
  - [ ] Dialog opens with source customer info displayed (read-only)
  - [ ] Target customer search filters by same customer_type
  - [ ] Step-by-step flow works (select target → confirm → execute)
  - [ ] Loading state shown during merge mutation
  - [ ] Success state shown with link to target customer
  - [ ] Error state shown with retry option
  - [ ] Dialog closes with animation on success
  - [ ] Cannot merge across different customer types
  - [ ] Responsive (desktop card + mobile full-screen)

  **QA Scenarios**:
  ```
  Scenario: Complete merge flow via dialog
    Tool: Playwright (playwright skill)
    Preconditions: Logged in as admin, on customer detail page for source customer
    Steps:
      1. Click button with text "Gộp KH" or merge icon
      2. Assert: Dialog opens, source customer name visible, cannot be edited
      3. Type target customer name in search field
      4. Assert: Search results filtered to same customer_type only
      5. Click on target customer in results
      6. Assert: Step advances to confirmation, shows order count to transfer
      7. Click "Xác nhận gộp" (confirm merge button)
      8. Assert: Loading spinner appears
      9. Assert: Success message with link to target customer appears
      10. Click link → navigates to target customer detail page
    Expected Result: Full merge flow completes successfully
    Evidence: .sisyphus/evidence/task-10-merge-dialog-flow.png

  Scenario: Reject cross-type merge in dialog
    Tool: Playwright
    Preconditions: Source is grocery type
    Steps:
      1. Open merge dialog
      2. Search for wholesale customer name
      3. Assert: Wholesale customers do NOT appear in results
    Expected Result: Only same-type customers shown
    Evidence: .sisyphus/evidence/task-10-cross-type-filter.png
  ```

  **Commit**: YES
  - Message: `feat(client): add MergeCustomerDialog with step-by-step flow`
  - Files: `client/src/pages/customers/dialogs/MergeCustomerDialog.tsx`

- [x] 11. Merge action on customer list page (bulk selection)

  **What to do**:
  - Update `client/src/pages/customers/GroceryCustomersPage.tsx` (and similar list pages if needed):
    - Add "Gộp KH" button that appears when exactly 2 customers are selected
    - Reuse existing `selectedIds` state and checkbox infrastructure
    - Open `MergeCustomerDialog` with first selected as source, second as target
    - Clear selection on successful merge
  - Also apply to: `WholesaleCustomersPage.tsx`, `VegetableCustomersPage.tsx`, `LoyalCustomersPage.tsx`
  - Pattern: reuse existing bulk action area (see loyal badge bulk button pattern at lines 176-189)
  - Add filter: only show merge button when customers have same `customer_type`

  **Must NOT do**:
  - Don't allow merge when 0 or 1 or 3+ customers selected
  - Don't break existing bulk loyal functionality
  - Don't create new checkbox infrastructure — reuse existing `selectedIds` pattern

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI modification across multiple list pages, conditional action display
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 12)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10 (hooks + dialog must exist)

  **References**:
  - `client/src/pages/customers/GroceryCustomersPage.tsx:176-189` — Bulk action bar pattern (selectedIds, button with icon)
  - `client/src/pages/customers/GroceryCustomersPage.tsx:50-51` — `selectedIds` state and `useBulkSetLoyal` hook
  - `client/src/pages/customers/GroceryCustomersPage.tsx:105-112` — `toggleSelect` pattern
  - `client/src/pages/customers/GroceryCustomersPage.tsx:206-214` — Select all checkbox in table header

  **Acceptance Criteria**:
  - [ ] "Gộp KH" button appears when exactly 2 customers selected
  - [ ] "Gộp KH" button hidden when 0, 1, or 3+ selected
  - [ ] Button disabled when selected customers have different types
  - [ ] Opens MergeCustomerDialog with first selected as source
  - [ ] Selection cleared after successful merge
  - [ ] Page refreshes to show updated customer list

  **QA Scenarios**:
  ```
  Scenario: Merge button appears for 2 selected same-type customers
    Tool: Playwright
    Preconditions: On GroceryCustomersPage with multiple grocery_sender customers
    Steps:
      1. Check first customer checkbox
      2. Assert: No "Gộp KH" button visible (only 1 selected)
      3. Check second customer checkbox
      4. Assert: Bulk action bar appears with "Gộp KH" button
      5. Click "Gộp KH" button
      6. Assert: MergeCustomerDialog opens with first selected customer as source
    Expected Result: Merge action triggered correctly from list page
    Evidence: .sisyphus/evidence/task-11-list-merge.png

  Scenario: Merge button hidden for different types
    Tool: Playwright
    Steps:
      1. Navigate to page showing all customers (or mixed types)
      2. Select one grocery customer and one wholesale customer
      3. Assert: "Gộp KH" button hidden or disabled
    Expected Result: Cross-type merge prevented in UI
    Evidence: .sisyphus/evidence/task-11-cross-type-hidden.png
  ```

  **Commit**: YES
  - Message: `feat(client): add merge action to customer list pages`
  - Files: `client/src/pages/customers/GroceryCustomersPage.tsx`, `client/src/pages/customers/WholesaleCustomersPage.tsx`, `client/src/pages/customers/VegetableCustomersPage.tsx`, `client/src/pages/customers/LoyalCustomersPage.tsx`

- [x] 12. Merge action on customer detail page

  **What to do**:
  - Update `client/src/pages/customers/CustomerDetailPage.tsx`:
    - Add "Gộp KH" button in the page header actions area (alongside existing "Thu Nợ" button)
    - Button opens `MergeCustomerDialog` with current customer as source
    - Use existing action button styling pattern (see line 148-155 for "Thu Nợ" button)
    - Add button near the customer name section (overview tab) as well for visibility
  - The button should use a distinctive but not alarming color (e.g., amber/warning tone)

  **Must NOT do**:
  - Don't replace existing header buttons
  - Don't show merge button if customer is already soft-deleted

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI modification to existing detail page with button placement considerations
  - **Skills**: [`vercel-react-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `client/src/pages/customers/CustomerDetailPage.tsx:148-155` — Header action button pattern ("Thu Nợ" button with icon + styling)
  - `client/src/pages/customers/CustomerDetailPage.tsx:139-157` — PageHeader component usage with `actions` prop
  - `client/src/pages/customers/CustomerDetailPage.tsx:42-46` — `useState` for dialog state management pattern

  **Acceptance Criteria**:
  - [ ] "Gộp KH" button visible in detail page header (alongside "Thu Nợ")
  - [ ] "Gộp KH" button visible in overview tab (near customer name section)
  - [ ] Button opens MergeCustomerDialog with current customer as source
  - [ ] Button hidden if customer is soft-deleted
  - [ ] Page refreshes after successful merge

  **QA Scenarios**:
  ```
  Scenario: Merge from detail page header
    Tool: Playwright
    Preconditions: On CustomerDetailPage for an active customer
    Steps:
      1. Assert: "Gộp KH" button visible in page header
      2. Click "Gộp KH"
      3. Assert: MergeCustomerDialog opens with current customer as source
      4. Complete merge flow
      5. After success, page should refresh to show updated customer data
    Expected Result: Merge initiated from detail page works correctly
    Evidence: .sisyphus/evidence/task-12-detail-merge.png

  Scenario: Merge button hidden for soft-deleted customer
    Tool: Playwright
    Preconditions: Navigate to detail page of a soft-deleted customer (if possible)
    Steps:
      1. Assert: "Gộp KH" button NOT visible
    Expected Result: Button hidden for deleted customers
    Evidence: .sisyphus/evidence/task-12-deleted-hidden.png
  ```

  **Commit**: YES
  - Message: `feat(client): add merge action to customer detail page`
  - Files: `client/src/pages/customers/CustomerDetailPage.tsx`

- [x] 13. Client integration tests (Vitest + Playwright E2E)

  **What to do**:
  - Create `client/src/pages/customers/__tests__/MergeCustomerDialog.test.tsx` (Vitest):
    - Test dialog renders with source customer info
    - Test target search filters by customer type
    - Test confirmation step shows correct summary
    - Test mutation is called with correct payload
  - Create Playwright E2E test:
    - Full merge flow from list page
    - Full merge flow from detail page
    - Cross-type rejection in UI
    - Validation error display
  - Use Vitest + React Testing Library for component tests
  - Use Playwright for end-to-end browser tests

  **Must NOT do**:
  - Don't skip Playwright E2E — unit tests alone are insufficient for multi-step UI flows
  - Don't test API endpoints here — that's server tests (Tasks 5-8)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Combined Vitest component tests + Playwright E2E tests across multiple pages
  - **Skills**: [`vercel-react-best-practices`, `playwright`]
    - `vercel-react-best-practices`: React Testing Library patterns
    - `playwright`: Browser automation for E2E flows

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Tasks 10-12 complete first)
  - **Parallel Group**: Wave 3 (last task)
  - **Blocks**: None
  - **Blocked By**: Tasks 10, 11, 12

  **References**:
  - `client/src/__tests__/` — Existing test directory and test patterns
  - `client/src/pages/customers/dialogs/MergeCustomerDialog.tsx` — Component being tested
  - `client/src/pages/customers/dialogs/AddEditCustomerDialog.tsx` — Similar dialog for test pattern reference

  **Acceptance Criteria**:
  - [ ] Vitest component tests pass (dialog rendering, search, confirmation)
  - [ ] Playwright E2E test passes (full merge flow from list page)
  - [ ] Playwright E2E test passes (full merge flow from detail page)
  - [ ] Playwright E2E test passes (cross-type rejection)

  **QA Scenarios**:
  ```
  Scenario: E2E — merge from list page selection
    Tool: Playwright
    Preconditions: 2 grocery_sender test customers exist
    Steps:
      1. Navigate to grocery list page
      2. Select checkbox for customer A and customer B
      3. Click "Gộp KH" in bulk action bar
      4. Verify MergeCustomerDialog shows customer A as source
      5. Complete merge flow
      6. Verify customer A no longer appears in list
      7. Navigate to customer B detail → verify A's name in aliases
    Expected Result: End-to-end merge completes successfully
    Evidence: .sisyphus/evidence/task-13-e2e-list-merge.png

  Scenario: E2E — merge errors display gracefully
    Tool: Playwright
    Steps:
      1. Attempt merge with API offline → verify error message
      2. Attempt self-merge (if UI allows) → verify validation error
    Expected Result: Errors displayed with user-friendly messages
    Evidence: .sisyphus/evidence/task-13-e2e-errors.png
  ```

  **Commit**: YES
  - Message: `test(client): add unit and E2E tests for customer merge`
  - Files: `client/src/pages/customers/__tests__/MergeCustomerDialog.test.tsx`, E2E test file

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test` for server. Run `npm run build` + `vitest` for client. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (merge + undo works, list page + dialog integration). Test edge cases: concurrent merge attempt, merge already-deleted customer, undo already-undone merge.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Task | Message | Files | Pre-commit |
|------|---------|-------|------------|
| 1 | `feat(db): add customer_merges table for merge audit trail` | `server/database/migrations/73_*.sql` | — |
| 2 | `feat(db): add merge_customers_atomic RPC function` | `server/database/migrations/74_*.sql` | — |
| 3 | `feat(db): add undo_customer_merge RPC function` | `server/database/migrations/75_*.sql` | — |
| 4 | `feat(perm): add MERGE_CUSTOMERS policy for admin and manager` | Permission policy file | — |
| 5 | `feat(api): add POST /api/customers/merge endpoint` | Controller, service, routes, test | `bun test` |
| 6 | `feat(api): add POST /api/customers/merge/undo/:mergeId endpoint` | Controller, service, routes, test | `bun test` |
| 7 | `test(server): add integration tests for merge RPC behavior` | `server/__tests__/customers-merge.test.ts` | `bun test` |
| 8 | `test(server): add integration tests for undo RPC behavior` | `server/__tests__/customers-merge-undo.test.ts` | `bun test` |
| 9 | `feat(client): add merge/undo API methods and React Query hooks` | `customersApi.ts`, `useCustomers.ts` | — |
| 10 | `feat(client): add MergeCustomerDialog with step-by-step flow` | `MergeCustomerDialog.tsx` | — |
| 11 | `feat(client): add merge action to customer list pages` | 4 list page files | — |
| 12 | `feat(client): add merge action to customer detail page` | `CustomerDetailPage.tsx` | — |
| 13 | `test(client): add unit and E2E tests for customer merge` | Test files | `vitest` |

---

## Success Criteria

### Verification Commands
```bash
# Server: run all merge-related tests
cd server && bun test __tests__/customers-merge.test.ts __tests__/customers-merge-undo.test.ts
# Expected: ALL tests pass (including TDD RED→GREEN validation)

# Server: verify RPC function exists and compiles
cd server && bun run -e "
  const { createClient } = require('@supabase/supabase-js');
  // Verify merge_customers_atomic and undo_customer_merge exist
"

# Client: build check
cd client && npm run build
# Expected: Build succeeds with no TypeScript errors

# Client: run component tests
cd client && npx vitest run src/pages/customers/__tests__/
# Expected: ALL tests pass

# API: verify endpoint exists
curl -X POST http://localhost:3001/api/customers/merge \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"source_id":"<uuid>","target_id":"<uuid>"}'
# Expected: HTTP 200 or 400 (depending on data), NOT 404

# API: verify undo endpoint exists
curl -X POST http://localhost:3001/api/customers/merge/undo/<merge_uuid> \
  -H "Authorization: Bearer <admin_token>"
# Expected: HTTP 200 or 400, NOT 404
```

### Final Checklist
- [ ] All 3 migration files created and applied successfully
- [ ] `merge_customers_atomic` RPC function handles all 6 FK columns across 6 tables
- [ ] `undo_customer_merge` RPC function fully reverses all merge operations
- [ ] `MERGE_CUSTOMERS` policy restricts to admin + manager
- [ ] `POST /api/customers/merge` endpoint returns correct responses
- [ ] `POST /api/customers/merge/undo/:mergeId` endpoint returns correct responses
- [ ] All Must Have items present
- [ ] All Must NOT Have items absent
- [ ] All server tests pass (`bun test`)
- [ ] All client tests pass (`vitest`)
- [ ] Client builds without errors (`npm run build`)
- [ ] Evidence files exist in `.sisyphus/evidence/` for all tasks
- [ ] Merge dialog functions correctly in list pages and detail page
- [ ] Cross-type merge prevented at API, DB, and UI levels
- [ ] Self-merge prevented
- [ ] Debt recalculated from ledger, not simple addition
- [ ] Undo restores complete pre-merge state
  **What to do**:
  - Create file `server/database/migrations/74_create_merge_rpc_function.sql`
  - Create a PostgreSQL function `public.merge_customers_atomic(p_source_id UUID, p_target_id UUID, p_merged_by UUID)` that:
    1. Validates both customers exist and `deleted_at IS NULL` (raise exception if not)
    2. Validates `p_source_id != p_target_id` (raise 'Cannot merge a customer into itself')
    3. Validates both have same `customer_type` (raise 'Cannot merge customers of different types')
    4. Acquires advisory lock: `PERFORM pg_advisory_xact_lock(hashtext(p_source_id::text || ':' || p_target_id::text))`
    5. Snapshots source customer into `v_source_data JSONB` (SELECT row_to_json from customers WHERE id = p_source_id)
    6. Handles `selected_alias` sync: for any transferred orders with `selected_alias` not in target's aliases, add it
    7. Updates ALL FK references (6 FK columns across 6 tables):
       - `UPDATE import_orders SET customer_id = p_target_id WHERE customer_id = p_source_id`
       - `UPDATE vegetable_orders SET customer_id = p_target_id WHERE customer_id = p_source_id`
       - `UPDATE export_orders SET customer_id = p_target_id WHERE customer_id = p_source_id`
       - `UPDATE receipts SET customer_id = p_target_id WHERE customer_id = p_source_id`
       - `UPDATE payment_collections SET customer_id = p_target_id WHERE customer_id = p_source_id`
       - (customer_debt_ledger handled separately in step 8)
    8. Handles `customer_debt_ledger` via DELETE+INSERT (NOT UPDATE — triggers handle debt sync correctly):
       - INSERT INTO customer_debt_ledger (customer_id, amount, transaction_type, reference_id, notes, created_by) SELECT p_target_id, amount, transaction_type, reference_id, notes, created_by FROM customer_debt_ledger WHERE customer_id = p_source_id
       - DELETE FROM customer_debt_ledger WHERE customer_id = p_source_id
    9. Adds source name to target's `aliases`: `UPDATE customers SET aliases = array_append(COALESCE(aliases, ARRAY[]::TEXT[]), v_source_name) WHERE id = p_target_id AND NOT (v_source_name = ANY(COALESCE(aliases, ARRAY[]::TEXT[])))`
    10. Handles `user_id` transfer: if target has no user_id AND source has one, transfer it; if both have, unlink source
    11. Merges `is_loyal`: set target's `is_loyal` to TRUE if either was loyal
    12. Recalculates target's stats from actual data:
        - `debt = (SELECT COALESCE(SUM(amount), 0) FROM customer_debt_ledger WHERE customer_id = p_target_id)`
        - `total_orders = (SELECT COUNT(*) FROM import_orders WHERE customer_id = p_target_id) + (SELECT COUNT(*) FROM vegetable_orders WHERE customer_id = p_target_id)`
        - `total_revenue = (SELECT COALESCE(SUM(total_amount), 0) FROM import_orders WHERE customer_id = p_target_id) + (SELECT COALESCE(SUM(total_amount), 0) FROM vegetable_orders WHERE customer_id = p_target_id)`
    13. Resets source customer stats to 0
    14. Soft-deletes source: `UPDATE customers SET deleted_at = NOW(), user_id = NULL WHERE id = p_source_id`
    15. Collects affected order IDs into JSONB for undo tracking
    16. Inserts merge log into `customer_merges`
    17. Returns merge record as JSONB
  - Follow the pattern from `handle_customer_payment_fifo_atomic` in schema.sql (lines 383-471)
  - Use `RETURNS JSONB` and `LANGUAGE plpgsql`

  **Must NOT do**:
  - Don't use UPDATE on `customer_debt_ledger.customer_id` — must use DELETE+INSERT
  - Don't use simple addition for stats — must recalculate from actual data
  - Don't merge without advisory lock

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex PostgreSQL function with transactions, locking, edge cases, and data integrity guarantees
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Domain overlap — PostgreSQL + Supabase + SQL best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4 — but logically after Task 1 for table reference)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5, 7 (merge API and tests depend on this RPC)
  - **Blocked By**: Task 1 (customer_merges table must exist)

  **References**:
  - `server/database/schema.sql:383-471` — `handle_customer_payment_fifo_atomic` RPC function (pattern: DECLARE, FOR loops, JSONB return, advisory lock pattern)
  - `server/database/migrations/10_optimize_debt_system.sql` — `customer_debt_ledger` table and triggers (must understand trigger behavior)
  - `server/database/migrations/72_add_customer_aliases.sql` — `customers.aliases` column (target for source name addition)
  - `server/database/schema.sql:66-94` — `import_orders` schema (customer_id FK)
  - `server/database/schema.sql:113-139` — `vegetable_orders` schema (customer_id FK)
  - `server/src/modules/customers/customers.service.ts:167-187` — `CustomerService.update` (aliases update pattern)

  **Acceptance Criteria**:
  - [ ] RPC function compiles without errors
  - [ ] Validates same customer_type (rejects cross-type merge)
  - [ ] Validates no self-merge
  - [ ] Validates both customers not soft-deleted
  - [ ] Advisory lock acquired and released
  - [ ] All 6 FK columns across 6 tables updated
  - [ ] customer_debt_ledger entries transferred via DELETE+INSERT
  - [ ] Source name added to target aliases (no duplicates)
  - [ ] user_id handled correctly (transfer if target lacks, unlink if both have)
  - [ ] is_loyal merged (TRUE if either was)
  - [ ] Stats recalculated from actual COUNT/SUM queries
  - [ ] Merge log inserted into customer_merges

  **QA Scenarios**:
  ```
  Scenario: Successful merge with all FK updates
    Tool: Bash (bun run with Supabase JS)
    Preconditions: Two test customers exist (source, target) with same customer_type, each has orders in import_orders, vegetable_orders, export_orders, receipts, payment_collections, and ledger entries.
    Steps:
      1. Call: SELECT merge_customers_atomic('<source_id>', '<target_id>', '<admin_user_id>')
      2. Assert: Returns JSONB with success=true, merge_id is UUID
      3. Query: SELECT COUNT(*) FROM import_orders WHERE customer_id = '<source_id>' → Expected: 0
      4. Query: SELECT COUNT(*) FROM import_orders WHERE customer_id = '<target_id>' → Expected: original_target_count + original_source_count
      5. Query: SELECT COUNT(*) FROM vegetable_orders WHERE customer_id = '<source_id>' → Expected: 0
      6. Query: SELECT COUNT(*) FROM customer_debt_ledger WHERE customer_id = '<source_id>' → Expected: 0
      7. Query: SELECT deleted_at FROM customers WHERE id = '<source_id>' → Expected: NOT NULL
      8. Query: SELECT aliases FROM customers WHERE id = '<target_id>' → Expected: array includes source name
      9. Query: SELECT debt FROM customers WHERE id = '<target_id>' → Expected: SUM of all merged ledger entries
    Expected Result: All FKs updated, source soft-deleted, aliases merged, debt recalculated
    Failure Indicators: Any source_id remaining in FK columns, debt mismatch, missing alias
    Evidence: .sisyphus/evidence/task-2-merge-success.txt

  Scenario: Reject different customer_types
    Tool: Bash
    Preconditions: Source has customer_type='grocery', target has customer_type='wholesale'
    Steps:
      1. Call: SELECT merge_customers_atomic('<grocery_id>', '<wholesale_id>', '<admin_id>')
      2. Assert: Raises exception with message containing 'different types'
    Expected Result: Exception raised, no data modified
    Evidence: .sisyphus/evidence/task-2-reject-type.txt

  Scenario: Reject self-merge
    Tool: Bash
    Steps:
      1. Call: SELECT merge_customers_atomic('<same_id>', '<same_id>', '<admin_id>')
      2. Assert: Raises exception with message containing 'itself'
    Expected Result: Exception raised
    Evidence: .sisyphus/evidence/task-2-reject-self.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add merge_customers_atomic RPC function`
  - Files: `server/database/migrations/74_create_merge_rpc_function.sql`

- [x] 3. Migration 75 — Create `undo_customer_merge` RPC function

  **What to do**:
  - Create file `server/database/migrations/75_create_undo_merge_rpc_function.sql`
  - Create `public.undo_customer_merge(p_merge_id UUID, p_undone_by UUID)` that:
    1. Validates merge exists and `undone_at IS NULL` (raise if already undone)
    2. Acquires advisory lock using merge ID
    3. Reads `source_data` JSONB from customer_merges to get source customer snapshot
    4. Reads `affected_order_ids` JSONB to know which tables/rows were modified
    5. Reverses all FK updates:
       - For each table in `affected_order_ids`, UPDATE rows back to source_id
       - Handles `customer_id` reversals across all tables
    6. Reverses `customer_debt_ledger` changes:
       - INSERT entries back to source_id (from target_id entries that came from source)
       - DELETE the duplicate entries from target_id
    7. Restores source customer from `source_data` snapshot (except `id`, `created_at`)
    8. Removes source name from target's `aliases`
    9. Recalculates target's stats (debt, total_orders, total_revenue) from actual data
    10. Recalculates source's stats from actual data
    11. Sets `customer_merges.undone_at = NOW()`, `customer_merges.undone_by = p_undone_by`
    12. Returns undo confirmation as JSONB
  - Use `RETURNS JSONB` and `LANGUAGE plpgsql`

  **Must NOT do**:
  - Don't forget to recalculate BOTH customers' stats after undo
  - Don't allow undoing an already-undone merge

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex undo logic requiring reverse mapping of all FK updates and ledger operations
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: PostgreSQL + Supabase patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6, 8 (undo API and tests)
  - **Blocked By**: Task 1 (customer_merges table), Task 2 (merge function creates the data undone by this)

  **References**:
  - `server/database/schema.sql:383-471` — RPC function pattern
  - `server/database/migrations/74_create_merge_rpc_function.sql` — Must reverse all operations done by merge RPC
  - `server/src/modules/customers/customers.service.ts:81-90` — `getById` pattern for reading customer data

  **Acceptance Criteria**:
  - [ ] RPC function compiles without errors
  - [ ] Rejects already-undone merges
  - [ ] All FK references restored to source_id
  - [ ] customer_debt_ledger entries restored to source
  - [ ] Source customer data restored (except id, created_at)
  - [ ] Source name removed from target aliases
  - [ ] Both customers' stats recalculated correctly
  - [ ] Merge log marked as undone

  **QA Scenarios**:
  ```
  Scenario: Successful undo restores all data
    Tool: Bash (Supabase JS)
    Preconditions: A merge has been performed (merge_id exists, source is soft-deleted, target has merged data)
    Steps:
      1. Call: SELECT undo_customer_merge('<merge_id>', '<admin_id>')
      2. Assert: Returns JSONB with success=true
      3. Query: SELECT deleted_at FROM customers WHERE id = '<source_id>' → Expected: NULL
      4. Query: SELECT COUNT(*) FROM import_orders WHERE customer_id = '<source_id>' → Expected: original count
      5. Query: SELECT COUNT(*) FROM customer_debt_ledger WHERE customer_id = '<source_id>' → Expected: original count
      6. Query: SELECT aliases FROM customers WHERE id = '<target_id>' → Expected: source name NOT in aliases
      7. Query: SELECT undone_at FROM customer_merges WHERE id = '<merge_id>' → Expected: NOT NULL
    Expected Result: All data restored to pre-merge state
    Evidence: .sisyphus/evidence/task-3-undo-success.txt

  Scenario: Reject undo of already-undone merge
    Tool: Bash
    Steps:
      1. Call: SELECT undo_customer_merge('<already_undone_merge_id>', '<admin_id>')
      2. Assert: Raises exception
    Expected Result: Exception raised, no data modified
    Evidence: .sisyphus/evidence/task-3-reject-double-undo.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add undo_customer_merge RPC function`
  - Files: `server/database/migrations/75_create_undo_merge_rpc_function.sql`

- [x] 4. Add `MERGE_CUSTOMERS` permission policy

  **What to do**:
  - Add policy entry in `server/src/config/permission-policies.ts`: `MERGE_CUSTOMERS` mapped to customer management page paths:
    ```typescript
    MERGE_CUSTOMERS: ['/ke-toan/khach-hang-tap-hoa', '/ke-toan/khach-hang-rau', '/ke-toan/vua-rau'],
    ```
  - Add `'MERGE_CUSTOMERS'` to the `PermissionPolicyName` union type (auto-derived from `PAGE_POLICIES` keys)
  - For strict role gating (admin + manager only), the route should use BOTH:
    - `requireRolesOnly('admin', 'manager')` — blocks non-admin/non-manager at the role level (line 158-167 of role.ts)
    - OR register the policy in PAGE_POLICIES and ensure only admin/manager roles have `app_role_permissions` for those page paths
  - Recommended: Use `requireRolesOnly('admin', 'manager')` for simplicity since admin is auto-allowed by `requirePolicy` anyway
  - Verify admin users are auto-allowed (line 105 of role.ts: `if (req.user.role === 'admin') return next()`)

  **Must NOT do**:
  - Don't create a new middleware — reuse existing `requireRolesOnly`
  - Don't change existing permission logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple config addition — one policy entry in existing structure
  - **Skills**: [`backend-node-express-postgresql`]
    - `backend-node-express-postgresql`: Express.js middleware pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 6 (routes reference this policy)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `server/src/config/permission-policies.ts:1-52` — `PAGE_POLICIES` definition (existing policies with page path mapping)
  - `server/src/middlewares/role.ts:158-167` — `requireRolesOnly` implementation (strict role gate, no page permission fallback)
  - `server/src/middlewares/role.ts:94-132` — `requirePolicy` implementation (uses PAGE_POLICIES → page paths → RBAC)
  - `server/src/middlewares/role.ts:104-106` — Admin auto-allow logic

  **Acceptance Criteria**:
  - [ ] `MERGE_CUSTOMERS` entry added to `PAGE_POLICIES` (for consistency/auditability)
  - [ ] Route uses `requireRolesOnly('admin', 'manager')` to restrict access
  - [ ] Admin users pass the gate automatically (role check)
  - [ ] Staff users receive 403 Forbidden
  - [ ] Unauthenticated users receive 401

  **QA Scenarios**:
  ```
  Scenario: Staff user rejected by MERGE_CUSTOMERS policy
    Tool: Bash (curl)
    Preconditions: Staff JWT token available
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge -H "Authorization: Bearer <staff_token>" -H "Content-Type: application/json" -d '{"source_id":"...","target_id":"..."}'
      2. Assert: HTTP 403 Forbidden
    Expected Result: 403 with permission denied message
    Evidence: .sisyphus/evidence/task-4-staff-rejected.txt

  Scenario: Admin user allowed by MERGE_CUSTOMERS policy
    Tool: Bash (curl)
    Preconditions: Admin JWT token available
    Steps:
      1. curl -X POST http://localhost:3001/api/customers/merge -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" -d '{"source_id":"...","target_id":"..."}'
      2. Assert: NOT 403 (either 200, 400, or 404 depending on data)
    Expected Result: Not forbidden — policy passes
    Evidence: .sisyphus/evidence/task-4-admin-allowed.txt
  ```

  **Commit**: YES
  - Message: `feat(perm): add MERGE_CUSTOMERS policy for admin and manager`
  - Files: Permission policy config file