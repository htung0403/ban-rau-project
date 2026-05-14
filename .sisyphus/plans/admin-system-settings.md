# Kế hoạch: Trang Cài Đặt Hệ Thống Admin

## TL;DR

> **Tóm tắt**: Tạo trang Admin System Settings mới (`/cai-dat-he-thong`) với 3 card sections: Cấu hình Zalo (tích hợp component có sẵn), Cấu hình khung giờ khóa hệ thống theo role, và Cấu hình chuyển hàng mới → hàng cũ (2 chế độ). Tất cả dữ liệu lưu qua API `general_settings` có sẵn. Không cần viết backend API mới.
>
> **Deliverables**:
> - `client/src/pages/admin/SystemSettingsPage.tsx` - Trang chính
> - `client/src/components/admin/settings/LockTimeConfig.tsx` - Section khóa hệ thống
> - `client/src/components/admin/settings/GoodsConversionConfig.tsx` - Section hàng cũ/mới
> - `client/src/hooks/queries/useSystemSettings.ts` - React Query hooks
> - `client/src/types/systemSettings.ts` - Type definitions
> - Migration SQL seed default values
> - Route `/cai-dat-he-thong` đã đăng ký trong App.tsx + moduleData.ts
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Types/Hooks (Wave 1) → Components (Wave 2) → Page + Wiring (Wave 3) → QA (Wave FINAL)

---

## Context

### Original Request
Tạo một trang Cài đặt hệ thống cho Admin, trong này sẽ có cài đặt ZaloConfig, cài đặt thờ gian khóa hệ thống cho các role, cài đặt thờ gian chuyển hàng cũ thành hàng mới.

### Interview Summary
**Key Discussions**:
- **Trang**: Trang mới hoàn toàn, route `/cai-dat-he-thong`, không mở rộng `/cai-dat` hiện tại
- **Khóa hệ thống**: Theo khung giờ cố định (start/end) cho mỗi role, đọc roles dynamic từ bảng `app_roles`
- **Hàng cũ/mới**: Cả 2 chế độ đều cấu hình được:
  - Mode `hours_after_confirm`: số giờ sau khi xác nhận (default 24h)
  - Mode `fixed_time`: mốc giờ trong ngày (ví dụ: 06:00)
- **ZaloConfig**: Component đã có sẵn, chỉ cần import vào trang mới

**Research Findings**:
- Backend API `general_settings` đã đủ: `GET/PUT /api/settings/general/:key`, bảng `general_settings` với `setting_value` (JSONB)
- Frontend hooks đã có: `useGeneralSettings`, `useUpsertGeneralSetting` trong `usePriceSettings.ts`
- Pattern tham khảo tốt nhất: `SalarySettingsPage.tsx` (PageHeader + card sections)
- UI: TailwindCSS v4 + custom tokens, không dùng shadcn/ui
- Form: Plain useState (giống SettingsPage, SalarySettingsPage)

### Metis Review
**Identified Gaps** (addressed):
- **Save strategy**: Mỗi section có nút "Lưu cấu hình" riêng (per-section save)
- **Layout**: Single scrollable page với 3 card sections (pattern SettingsPage)
- **Schema khóa hệ thống**: Thêm `days` (các ngày trong tuần, default [1,2,3,4,5,6])
- **Default values**: Hardcode fallback trong UI + migration SQL seed
- **Enforcement scope**: Chỉ làm UI cấu hình, KHÔNG implement logic khóa thực tế
- **Timezone**: Luôn `Asia/Ho_Chi_Minh`
- **Scope lockdown**: Không làm notification, audit log, multi-Zalo, preview lock

---

## Work Objectives

### Core Objective
Tạo trang Admin System Settings (`/cai-dat-he-thong`) cho phép admin cấu hình: (1) kết nối Zalo, (2) khung giờ truy cập theo role, (3) quy tắc chuyển hàng mới sang hàng cũ.

### Concrete Deliverables
- Trang `SystemSettingsPage.tsx` với layout 3 card sections
- Component `LockTimeConfig.tsx`: đọc roles từ API, cho phép cấu hình start/end time + days per role
- Component `GoodsConversionConfig.tsx`: toggle 2 modes, input tương ứng
- React Query hooks: `useSystemSettings`, `useUpsertSystemSetting`
- Types: `SystemSettings`, `LockSchedule`, `InventoryTransferRule`
- Migration SQL: seed default values cho `system_lock_schedule` và `inventory_transfer_rule`
- Route registration: `App.tsx`, `moduleData.ts`, `routePermissions.ts`

### Definition of Done
- [ ] Navigate to `/cai-dat-he-thong` → page loads without 404
- [ ] Trang hiển thị 3 card sections: Zalo, Khóa hệ thống, Hàng cũ/mới
- [ ] Zalo section: ZaloConfig component render và hoạt động
- [ ] Lock section: hiển thị tất cả roles từ `app_roles`, cho phép edit/save
- [ ] Goods conversion section: toggle 2 modes, save và reload vẫn giữ giá trị
- [ ] Module card "Cài đặt hệ thống" xuất hiện trong `/hanh-chinh-nhan-su` → Quản trị

### Must Have
- 3 sections trên cùng 1 trang
- Dữ liệu persist qua `general_settings` API
- Đọc roles dynamic (không hardcode)
- Responsive (mobile + desktop)
- Có loading state và error state

### Must NOT Have (Guardrails)
- KHÔNG tạo backend API endpoints mới (dùng `/api/settings/general/:key` có sẵn)
- KHÔNG sửa đổi ZaloConfig component
- KHÔNG implement logic khóa hệ thống thực tế (chỉ UI config)
- KHÔNG implement logic chuyển hàng cũ/mới thực tế (chỉ UI config)
- KHÔNG thêm timezone selector (luôn Asia/Ho_Chi_Minh)
- KHÔNG thêm audit log, notification, preview lock
- KHÔNG cho phép tạo/sửa/xóa role (read-only từ app_roles)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (không thấy jest/vitest trong codebase)
- **Automated tests**: None
- **Framework**: None
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **Frontend/UI**: Playwright - Navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) - Send requests, assert status + response fields
- **Evidence**: `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Types + Constants (new file)
├── Task 2: React Query Hooks (wrapper around existing settingsApi)
├── Task 3: Migration SQL seed defaults
└── Task 4: Verify app_roles API structure (quick probe)

Wave 2 (After Wave 1 - components, MAX PARALLEL):
├── Task 5: LockTimeConfig component
├── Task 6: GoodsConversionConfig component
└── Task 7: ZaloConfig integration check

Wave 3 (After Wave 2 - page + wiring):
├── Task 8: SystemSettingsPage (assembles all sections)
├── Task 9: Route registration (App.tsx + moduleData.ts + routePermissions.ts)
└── Task 10: Navigation verification

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 5/6 → Task 8 → Task 9 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| 1 (Types) | - | 2, 5, 6 |
| 2 (Hooks) | - | 5, 6, 8 |
| 3 (Migration) | - | F3 |
| 4 (Probe roles) | - | 5 |
| 5 (LockTime) | 1, 2, 4 | 8 |
| 6 (GoodsConversion) | 1, 2 | 8 |
| 7 (Zalo check) | - | 8 |
| 8 (Page) | 5, 6, 7 | 9 |
| 9 (Routes) | 8 | 10 |
| 10 (Nav verify) | 9 | F1-F4 |
| F1-F4 | 10 | - |

### Agent Dispatch Summary

- **Wave 1**: T1-T4 → `quick`
- **Wave 2**: T5-T7 → `visual-engineering` (T5, T6), `quick` (T7)
- **Wave 3**: T8-T10 → `visual-engineering` (T8), `quick` (T9, T10)
- **Wave FINAL**: F1-F4 → `oracle`, `unspecified-high`, `unspecified-high`, `deep`

---

## TODOs

- [x] 1. **Types + Constants cho System Settings**

  **What to do**:
  - Tạo file `client/src/types/systemSettings.ts` với các interfaces:
    ```typescript
    export interface LockSchedule {
      schedules: Array<{
        role_key: string;
        start_time: string; // "HH:mm"
        end_time: string;   // "HH:mm"
        days: number[];     // 0=Sun, 1=Mon, ... 6=Sat. Default [1,2,3,4,5,6]
      }>;
    }
    export interface InventoryTransferRule {
      mode: 'hours_after_confirm' | 'fixed_time';
      hours?: number;       // required if mode='hours_after_confirm', min 1
      fixed_time?: string;  // "HH:mm", required if mode='fixed_time'
      timezone: string;     // always 'Asia/Ho_Chi_Minh'
    }
    ```
  - Tạo file `client/src/constants/systemSettings.ts` với setting keys và default values:
    ```typescript
    export const SETTING_KEYS = {
      LOCK_SCHEDULE: 'system_lock_schedule',
      INVENTORY_TRANSFER: 'inventory_transfer_rule',
    } as const;
    export const DEFAULT_LOCK_SCHEDULE: LockSchedule = { schedules: [] };
    export const DEFAULT_INVENTORY_TRANSFER: InventoryTransferRule = {
      mode: 'hours_after_confirm',
      hours: 24,
      timezone: 'Asia/Ho_Chi_Minh',
    };
    ```

  **Must NOT do**:
  - KHÔNG định nghĩa type cho ZaloConfig (đã có sẵn)
  - KHÔNG hardcode role keys vào type

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Chỉ là định nghĩa TypeScript types và constants, không có logic phức tạp

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `client/src/types/index.ts` - Pattern định nghĩa type trong project
  - `server/src/modules/settings/settings.service.ts:59-89` - Cấu trúc general_settings

  **Acceptance Criteria**:
  - [ ] File `systemSettings.ts` tồn tại trong `client/src/types/`
  - [ ] File `systemSettings.ts` tồn tại trong `client/src/constants/`
  - [ ] Các types compile được (tsc không báo lỗi)

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. cd client && npx tsc --noEmit
    Expected Result: No type errors related to systemSettings types
    Evidence: .sisyphus/evidence/task-1-types-compile.log
  ```

  **Evidence to Capture**:
  - [ ] task-1-types-compile.log

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(admin): add system settings types and constants`
  - Files: `client/src/types/systemSettings.ts`, `client/src/constants/systemSettings.ts`

---

- [x] 2. **React Query Hooks cho System Settings**

  **What to do**:
  - Tạo file `client/src/hooks/queries/useSystemSettings.ts`
  - Export query key factory:
    ```typescript
    export const systemSettingsKeys = {
      all: ['system-settings'] as const,
      lockSchedule: ['system-settings', 'lock'] as const,
      inventoryTransfer: ['system-settings', 'inventory'] as const,
    };
    ```
  - Export hooks:
    - `useLockSchedule()` - queries `settingsApi.getGeneralSettingByKey(SETTING_KEYS.LOCK_SCHEDULE)`
    - `useInventoryTransferRule()` - queries `settingsApi.getGeneralSettingByKey(SETTING_KEYS.INVENTORY_TRANSFER)`
    - `useUpsertSystemSetting()` - mutation wrapper quanh `settingsApi.upsertGeneralSetting`, tự động invalidate query keys
  - Mỗi hook cần có default values (dùng constants từ Task 1) khi API trả về null/undefined

  **Must NOT do**:
  - KHÔNG tạo API calls trực tiếp (dùng `settingsApi` có sẵn)
  - KHÔNG tạo toast notification nếu project không dùng toast (check `usePriceSettings.ts` để xem pattern)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Hook wrappers đơn giản, pattern đã có sẵn trong project

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5, 6, 8
  - **Blocked By**: None

  **References**:
  - `client/src/hooks/queries/usePriceSettings.ts:62-95` - Pattern hooks chính xác cho general settings
  - `client/src/api/settingsApi.ts` - API methods có sẵn

  **Acceptance Criteria**:
  - [ ] File `useSystemSettings.ts` tồn tại
  - [ ] Hooks export đúng signatures
  - [ ] Default values được áp dụng khi setting chưa tồn tại

  **QA Scenarios**:
  ```
  Scenario: Hooks return default values when setting not found
    Tool: Bash (curl)
    Preconditions: Ensure server running, no 'system_lock_schedule' in DB (or delete it)
    Steps:
      1. curl http://localhost:3000/api/settings/general/system_lock_schedule
      2. Verify response has default empty schedules
    Expected Result: UI shows default empty state, no crash
    Evidence: .sisyphus/evidence/task-2-hooks-default.json
  ```

  **Evidence to Capture**:
  - [ ] task-2-hooks-default.json

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(admin): add system settings react query hooks`
  - Files: `client/src/hooks/queries/useSystemSettings.ts`

---

- [x] 3. **Migration SQL Seed Default Values**

  **What to do**:
  - Tạo file migration mới: `server/database/migrations/[timestamp]_system_settings_defaults.sql`
  - Seed 2 settings keys với default values:
    ```sql
    INSERT INTO general_settings (setting_key, setting_value, description, updated_at) VALUES
    ('system_lock_schedule', '{"schedules":[]}'::jsonb, 'Khung giờ khóa hệ thống theo role', NOW()),
    ('inventory_transfer_rule', '{"mode":"hours_after_confirm","hours":24,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb, 'Chế độ chuyển hàng mới sang hàng cũ', NOW())
    ON CONFLICT (setting_key) DO NOTHING;
    ```
  - Đặt timestamp theo format của các migration hiện có (ví dụ: `29_system_settings_defaults.sql` nếu migration cuối là 28)

  **Must NOT do**:
  - KHÔNG tạo bảng mới (dùng `general_settings` có sẵn)
  - KHÔNG sửa migration cũ (chỉ tạo migration mới)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Chỉ là 1 file SQL đơn giản

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task F3 (QA verification)
  - **Blocked By**: None

  **References**:
  - `server/database/migrations/28_add_general_settings.sql` - Pattern migration
  - `server/database/migrations/` - Xem naming convention

  **Acceptance Criteria**:
  - [ ] Migration file tồn tại với naming đúng convention
  - [ ] SQL syntax hợp lệ
  - [ ] ON CONFLICT DO NOTHING để idempotent

  **QA Scenarios**:
  ```
  Scenario: Migration runs successfully
    Tool: Bash
    Steps:
      1. psql -f server/database/migrations/[timestamp]_system_settings_defaults.sql
      2. psql -c "SELECT setting_key FROM general_settings WHERE setting_key IN ('system_lock_schedule', 'inventory_transfer_rule');"
    Expected Result: 2 rows returned
    Evidence: .sisyphus/evidence/task-3-migration-result.txt
  ```

  **Evidence to Capture**:
  - [ ] task-3-migration-result.txt

  **Commit**: YES (groups with Wave 1)
  - Message: `chore(db): seed default system settings`
  - Files: `server/database/migrations/[timestamp]_system_settings_defaults.sql`

---

- [x] 4. **Verify app_roles API Structure**

  **What to do**:
  - Kiểm tra API endpoint để lấy danh sách roles (từ `roles.routes.ts`)
  - Xác nhận response shape (có `role_key`, `role_name`, `is_active` hay không)
  - Nếu API chưa có public endpoint cho roles list, cần tìm cách khác (ví dụ: từ `routePermissions.ts` hoặc hardcode tạm thời với TODO)
  - Ghi chép kết quả vào draft hoặc comment trong code để Task 5 sử dụng

  **Must NOT do**:
  - KHÔNG sửa backend API (nếu thiếu, ghi chú và dùng hardcode tạm với TODO)
  - KHÔNG tạo backend routes mới

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Quick investigation task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `server/src/modules/roles/roles.routes.ts` - Role API routes
  - `server/src/modules/roles/roles.service.ts` - Role service methods
  - `client/src/utils/routePermissions.ts` - Có thể có role list hardcoded ở đây

  **Acceptance Criteria**:
  - [ ] Xác định được cách lấy danh sách roles (API endpoint hoặc hardcode list)
  - [ ] Ghi chú rõ ràng trong Task 5 references

  **QA Scenarios**:
  ```
  Scenario: Role API exists and returns expected shape
    Tool: Bash (curl)
    Steps:
      1. curl http://localhost:3000/api/roles (hoặc endpoint tương ứng)
    Expected Result: 200 với array of roles, mỗi role có ít nhất role_key và role_name
    Evidence: .sisyphus/evidence/task-4-roles-api.json
  ```

  **Evidence to Capture**:
  - [ ] task-4-roles-api.json

  **Commit**: NO (this is investigation, not code change)

---

- [x] 5. **LockTimeConfig Component**

  **What to do**:
  - Tạo file `client/src/components/admin/settings/LockTimeConfig.tsx`
  - Layout: Card section theo pattern `bg-card rounded-2xl border border-border shadow-sm`
  - Header: `px-6 py-4 border-b border-border bg-muted/30` với icon `Clock` + title "Khung giờ truy cập hệ thống"
  - Body:
    - Load settings từ `useLockSchedule()` hook
    - Hiển thị table/grid các role với columns: Role, Giờ bắt đầu, Giờ kết thúc, Các ngày trong tuần
    - Mỗi row có input type="time" cho start/end (format HH:mm)
    - Days: hiển thị 7 toggle buttons (T2-T8 hoặc Mon-Sun)
    - Nút "Lưu cấu hình" gọi `useUpsertSystemSetting()` với key `system_lock_schedule`
    - Nút "Thêm role" hoặc hiển thị tất cả roles từ `app_roles` (tùy kết quả Task 4)
  - Empty state: Nếu chưa có schedule nào, hiển thị message + nút "Thiết lập khung giờ"
  - Validation: start_time < end_time, ít nhất 1 day được chọn

  **Must NOT do**:
  - KHÔNG cho phép tạo/sửa/xóa role (chỉ cấu hình schedule cho role có sẵn)
  - KHÔNG implement logic khóa thực tế (chỉ UI config)
  - KHÔNG cho phép start_time === end_time (min 1 phút khác biệt)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI component phức tạp với form, table/grid, validation, responsive

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 4

  **References**:
  - `client/src/pages/hr/SalarySettingsPage.tsx` - Pattern card section + table + save
  - `client/src/components/shared/ZaloConfig.tsx:72-176` - Pattern card styling
  - `client/src/hooks/queries/usePriceSettings.ts:74-95` - Pattern mutation hook
  - Kết quả Task 4 - Cách lấy danh sách roles

  **Acceptance Criteria**:
  - [ ] Component render trong Storybook hoặc page test
  - [ ] Hiển thị đúng số lượng roles từ API
  - [ ] Input time hoạt động đúng (HTML5 time input)
  - [ ] Toggle days hoạt động đúng
  - [ ] Save thành công → toast/message success, query refetch
  - [ ] Validation hoạt động (start < end, ít nhất 1 day)

  **QA Scenarios**:
  ```
  Scenario: LockTimeConfig renders and saves correctly
    Tool: Playwright
    Preconditions: User logged in as admin, server running, at /cai-dat-he-thong
    Steps:
      1. Navigate to /cai-dat-he-thong
      2. Wait for "Khung giờ truy cập hệ thống" section visible
      3. Set staff start_time to "08:00"
      4. Set staff end_time to "17:00"
      5. Ensure Mon-Fri toggles are active
      6. Click "Lưu cấu hình"
      7. Wait for success message
      8. Refresh page
      9. Verify staff row still shows 08:00-17:00
    Expected Result: Values persist after refresh
    Failure Indicators: Values reset, save error, no success feedback
    Evidence: .sisyphus/evidence/task-5-locktime-save.png

  Scenario: LockTimeConfig validation rejects invalid input
    Tool: Playwright
    Preconditions: Same as above
    Steps:
      1. Set staff start_time to "18:00"
      2. Set staff end_time to "08:00" (start > end)
      3. Click "Lưu cấu hình"
    Expected Result: Validation error displayed, save not triggered
    Evidence: .sisyphus/evidence/task-5-locktime-validation.png
  ```

  **Evidence to Capture**:
  - [ ] task-5-locktime-save.png
  - [ ] task-5-locktime-validation.png

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(admin): add LockTimeConfig component`
  - Files: `client/src/components/admin/settings/LockTimeConfig.tsx`

---

- [x] 6. **GoodsConversionConfig Component**

  **What to do**:
  - Tạo file `client/src/components/admin/settings/GoodsConversionConfig.tsx`
  - Layout: Card section theo pattern `bg-card rounded-2xl border border-border shadow-sm`
  - Header: `px-6 py-4 border-b border-border bg-muted/30` với icon `Package` + title "Chuyển hàng mới sang hàng cũ"
  - Body:
    - Load settings từ `useInventoryTransferRule()` hook
    - Toggle/Select chọn mode: "Theo số giờ sau xác nhận" hoặc "Theo mốc giờ trong ngày"
    - Nếu mode = `hours_after_confirm`: hiển thị number input (min 1, max 168), đơn vị "giờ"
    - Nếu mode = `fixed_time`: hiển thị time input (HH:mm)
    - Hiển thị timezone readonly: "Asia/Ho_Chi_Minh"
    - Nút "Lưu cấu hình" gọi `useUpsertSystemSetting()` với key `inventory_transfer_rule`
  - Empty/default state: mode = hours_after_confirm, hours = 24
  - Validation: hours >= 1, fixed_time phải là valid HH:mm

  **Must NOT do**:
  - KHÔNG thêm mode thứ 3
  - KHÔNG implement logic chuyển hàng thực tế (chỉ UI config)
  - KHÔNG cho phép đổi timezone

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI component với conditional rendering, toggle logic, validation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `client/src/pages/SettingsPage.tsx` - Pattern card section đơn giản
  - `client/src/components/ui/SearchableSelect.tsx` - Nếu cần custom select cho mode toggle
  - `client/src/hooks/queries/usePriceSettings.ts:74-95` - Pattern mutation hook

  **Acceptance Criteria**:
  - [ ] Component render đúng 2 modes
  - [ ] Toggle mode thay đổi input tương ứng
  - [ ] Save hours mode thành công
  - [ ] Save fixed_time mode thành công
  - [ ] Validation hoạt động (hours >= 1)
  - [ ] Giá trị persist sau refresh

  **QA Scenarios**:
  ```
  Scenario: GoodsConversionConfig toggle modes and save
    Tool: Playwright
    Preconditions: User logged in as admin, at /cai-dat-he-thong
    Steps:
      1. Navigate to /cai-dat-he-thong
      2. Wait for "Chuyển hàng mới sang hàng cũ" section visible
      3. Verify default mode is "hours_after_confirm" with value 24
      4. Change value to 12
      5. Click "Lưu cấu hình"
      6. Wait for success
      7. Toggle mode to "fixed_time"
      8. Set time to "06:00"
      9. Click "Lưu cấu hình"
      10. Refresh page
      11. Verify mode is "fixed_time" and time is "06:00"
    Expected Result: Mode and value persist correctly
    Failure Indicators: Mode resets, value not saved, wrong input shown
    Evidence: .sisyphus/evidence/task-6-goods-toggle.png

  Scenario: GoodsConversionConfig rejects invalid hours
    Tool: Playwright
    Steps:
      1. Select "hours_after_confirm" mode
      2. Enter 0 into hours input
      3. Click "Lưu cấu hình"
    Expected Result: Validation error: "Số giờ phải lớn hơn 0"
    Evidence: .sisyphus/evidence/task-6-goods-validation.png
  ```

  **Evidence to Capture**:
  - [ ] task-6-goods-toggle.png
  - [ ] task-6-goods-validation.png

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(admin): add GoodsConversionConfig component`
  - Files: `client/src/components/admin/settings/GoodsConversionConfig.tsx`

---

- [x] 7. **ZaloConfig Integration Check**

  **What to do**:
  - Xác nhận `ZaloConfig` component có thể import và sử dụng độc lập trong `SystemSettingsPage`
  - Kiểm tra xem component có phụ thuộc vào route hay context nào không
  - Nếu có vấn đề (ví dụ: hardcoded route, context dependency), ghi chú để xử lý trong Task 8
  - Đảm bảo component tự fetch data của nó (qua `axiosClient` trực tiếp)

  **Must NOT do**:
  - KHÔNG sửa đổi ZaloConfig.tsx
  - KHÔNG thay đổi behavior của ZaloConfig

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Quick verification task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: None

  **References**:
  - `client/src/components/shared/ZaloConfig.tsx:1-179` - Kiểm tra imports, props, side effects

  **Acceptance Criteria**:
  - [ ] Xác nhận ZaloConfig không phụ thuộc route-specific context
  - [ ] Xác nhận ZaloConfig tự quản lý state và API calls
  - [ ] Ghi chú kết quả cho Task 8

  **QA Scenarios**:
  ```
  Scenario: ZaloConfig is importable and standalone
    Tool: Bash
    Steps:
      1. grep -n "useNavigate\|useLocation\|useParams" client/src/components/shared/ZaloConfig.tsx
    Expected Result: No matches (no route dependencies)
    Evidence: .sisyphus/evidence/task-7-zalo-standalone.txt
  ```

  **Evidence to Capture**:
  - [ ] task-7-zalo-standalone.txt

  **Commit**: NO (investigation task)

---

- [x] 8. **SystemSettingsPage Assembly**

  **What to do**:
  - Tạo file `client/src/pages/admin/SystemSettingsPage.tsx`
  - Sử dụng `PageHeader` component với:
    - Title: "Cài đặt hệ thống"
    - Icon: `Settings` (lucide-react)
    - Description: "Quản lý các thiết lập hệ thống như khung giờ truy cập, quy tắc chuyển hàng, và cấu hình Zalo."
    - `backPath="/hanh-chinh-nhan-su"`
  - Layout: Container với padding, grid/flex layout cho các card sections
  - Import và render 3 components:
    1. `ZaloConfig` (từ `components/shared/ZaloConfig`)
    2. `LockTimeConfig` (từ `components/admin/settings/LockTimeConfig`)
    3. `GoodsConversionConfig` (từ `components/admin/settings/GoodsConversionConfig`)
  - Thêm entry animation: `animate-in fade-in slide-in-from-bottom-4 duration-500`
  - Responsive: Stack vertically trên mobile, có thể 2 columns trên desktop (tùy design)
  - Xử lý loading state toàn trang nếu cần (hoặc để mỗi component tự xử lý)

  **Must NOT do**:
  - KHÔNG đặt business logic trong page (để trong components con)
  - KHÔNG thêm section thứ 4
  - KHÔNG thay đổi behavior của ZaloConfig, LockTimeConfig, GoodsConversionConfig

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Page assembly với layout, animation, responsive

  **Parallelization**:
  - **Can Run In Parallel**: NO (must wait for Tasks 5, 6, 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 5, 6, 7

  **References**:
  - `client/src/pages/hr/SalarySettingsPage.tsx` - Pattern PageHeader + card layout
  - `client/src/pages/SettingsPage.tsx` - Pattern card sections + animation
  - `client/src/components/shared/PageHeader.tsx` - Props và usage

  **Acceptance Criteria**:
  - [ ] File `SystemSettingsPage.tsx` tồn tại
  - [ ] Page render 3 sections
  - [ ] PageHeader hiển thị đúng title, icon, description
  - [ ] Animation hoạt động khi load
  - [ ] Responsive trên mobile (375px width)

  **QA Scenarios**:
  ```
  Scenario: SystemSettingsPage renders all 3 sections
    Tool: Playwright
    Preconditions: User logged in as admin
    Steps:
      1. Navigate to /cai-dat-he-thong
      2. Wait for page load
      3. Screenshot full page
      4. Assert "Cấu hình Zalo Notification" visible
      5. Assert "Khung giờ truy cập hệ thống" visible
      6. Assert "Chuyển hàng mới sang hàng cũ" visible
    Expected Result: All 3 sections visible, no 404, no crash
    Failure Indicators: Missing sections, 404 error, blank page
    Evidence: .sisyphus/evidence/task-8-page-render.png

  Scenario: SystemSettingsPage responsive on mobile
    Tool: Playwright
    Steps:
      1. Set viewport to 375x667
      2. Navigate to /cai-dat-he-thong
      3. Screenshot
    Expected Result: All sections stack vertically, text readable, buttons tappable
    Evidence: .sisyphus/evidence/task-8-page-mobile.png
  ```

  **Evidence to Capture**:
  - [ ] task-8-page-render.png
  - [ ] task-8-page-mobile.png

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(admin): add SystemSettingsPage with 3 config sections`
  - Files: `client/src/pages/admin/SystemSettingsPage.tsx`

---

- [x] 9. **Route Registration + Module Card + Permissions**

  **What to do**:
  - **App.tsx**: Thêm route mới trong block `<ProtectedRoute><MainLayout>`:
    ```tsx
    import SystemSettingsPage from './pages/admin/SystemSettingsPage';
    // ...
    <Route path="/cai-dat-he-thong" element={<SystemSettingsPage />} />
    ```
  - **moduleData.ts**: Thêm card vào section "Quản trị" của module `/hanh-chinh-nhan-su`:
    ```tsx
    {
      icon: Settings, // from lucide-react
      title: 'Cài đặt hệ thống',
      description: 'Quản lý khung giờ truy cập, quy tắc chuyển hàng và cấu hình Zalo.',
      colorScheme: 'slate',
      path: '/cai-dat-he-thong'
    }
    ```
  - **routePermissions.ts**: Kiểm tra xem có cần thêm path `/cai-dat-he-thong` vào `LEGACY_ALLOWED_PATHS_BY_ROLE` không. Vì admin/manager đã có `isAllRoutesAllowed` = true, nên có thể không cần. Nhưng nếu page cần policy guard (không chỉ route-level), thì cần thêm vào `permissionPolicies.ts` mapping. Tuy nhiên vì dùng API `/api/settings/general/:key` đã có policy guard sẵn, nên frontend route có thể không cần thêm.
  - **sidebarMenu.ts**: Kiểm tra xem có cần thêm vào sidebar không (có thể không cần vì đã có trong moduleData)

  **Must NOT do**:
  - KHÔNG thay đổi route `/cai-dat` hiện tại
  - KHÔNG xóa module card cũ
  - KHÔNG thay đổi permission policies của các route khác

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Quick registration changes across 2-3 files

  **Parallelization**:
  - **Can Run In Parallel**: YES (với Task 10 nếu không phụ thuộc, nhưng nên sequential để đảm bảo route đăng ký trước khi test nav)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Task 8

  **References**:
  - `client/src/App.tsx` - Pattern thêm route
  - `client/src/data/moduleData.ts` - Pattern thêm module card
  - `client/src/utils/routePermissions.ts` - Pattern cấp quyền route
  - `client/src/data/sidebarMenu.ts` - Pattern sidebar (nếu cần)

  **Acceptance Criteria**:
  - [ ] Route `/cai-dat-he-thong` đăng ký trong App.tsx
  - [ ] Module card "Cài đặt hệ thống" xuất hiện trong `/hanh-chinh-nhan-su`
  - [ ] Click card điều hướng đúng đến `/cai-dat-he-thong`
  - [ ] Không có regression route khác

  **QA Scenarios**:
  ```
  Scenario: Route registration works
    Tool: Playwright
    Steps:
      1. Navigate to /cai-dat-he-thong
      2. Assert URL is /cai-dat-he-thong
      3. Assert "Cài đặt hệ thống" heading visible
    Expected Result: Page loads, no 404
    Evidence: .sisyphus/evidence/task-9-route.png

  Scenario: Module card registered correctly
    Tool: Playwright
    Preconditions: User logged in as admin
    Steps:
      1. Navigate to /hanh-chinh-nhan-su
      2. Scroll to "Quản trị" section
      3. Assert card "Cài đặt hệ thống" visible
      4. Click card
      5. Assert URL changed to /cai-dat-he-thong
    Expected Result: Navigation works from module page
    Evidence: .sisyphus/evidence/task-9-module-card.png
  ```

  **Evidence to Capture**:
  - [ ] task-9-route.png
  - [ ] task-9-module-card.png

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(admin): register system settings route and module card`
  - Files: `client/src/App.tsx`, `client/src/data/moduleData.ts`, `client/src/utils/routePermissions.ts` (nếu cần)

---

- [x] 10. **Navigation and Integration Verification**

  **What to do**:
  - Kiểm tra navigation từ Topbar (nếu có link đến settings)
  - Kiểm tra navigation từ Sidebar (nếu đã thêm)
  - Kiểm tra breadcrumb (nếu project có breadcrumb)
  - Kiểm tra active state trong sidebar/module card khi ở trang `/cai-dat-he-thong`
  - Đảm bảo không có broken links

  **Must NOT do**:
  - KHÔNG thêm navigation mới nếu không thuộc scope
  - KHÔNG sửa đổi navigation của các trang khác

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Quick verification task

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: Wave FINAL
  - **Blocked By**: Task 9

  **References**:
  - `client/src/components/layout/Topbar.tsx` - Kiểm tra settings link
  - `client/src/components/layout/Sidebar.tsx` - Kiểm tra active state

  **Acceptance Criteria**:
  - [ ] Tất cả navigation paths hoạt động
  - [ ] Không có broken links
  - [ ] Active state hiển thị đúng (nếu có)

  **QA Scenarios**:
  ```
  Scenario: Navigation paths work end-to-end
    Tool: Playwright
    Steps:
      1. Start at /dashboard
      2. Navigate to /hanh-chinh-nhan-su
      3. Click "Cài đặt hệ thống" card
      4. Verify at /cai-dat-he-thong
      5. Click browser back
      6. Verify back at /hanh-chinh-nhan-su
    Expected Result: Navigation flow hoàn chỉnh, không có 404
    Evidence: .sisyphus/evidence/task-10-navigation-flow.png
  ```

  **Evidence to Capture**:
  - [ ] task-10-navigation-flow.png

  **Commit**: NO (investigation/verification, không cần commit riêng)

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(admin): add system settings types, hooks, and migration`
- **Wave 2**: `feat(admin): add LockTimeConfig and GoodsConversionConfig components`
- **Wave 3**: `feat(admin): add SystemSettingsPage and register routes`
- **Wave FINAL**: `chore: final QA and cleanup`

---

## Success Criteria

### Verification Commands
```bash
# Frontend build
cd client && npm run build
# Expected: Build succeeds with 0 errors

# Type check
cd client && npx tsc --noEmit
# Expected: No type errors

# API check (after server starts)
curl http://localhost:3000/api/settings/general/system_lock_schedule
# Expected: 200 with JSON value

curl http://localhost:3000/api/settings/general/inventory_transfer_rule
# Expected: 200 with JSON value
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Route `/cai-dat-he-thong` accessible
- [ ] Module card visible in `/hanh-chinh-nhan-su`
- [ ] All 3 sections render correctly
- [ ] Save/load settings working
- [ ] Responsive on mobile
- [ ] All evidence files captured
