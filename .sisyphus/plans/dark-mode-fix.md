# Kế hoạch Tổng thể Khắc phục Dark Mode (Triệt để)

## 1. Bối cảnh & Mục tiêu
- **Mục tiêu:** Dọn dẹp triệt để hơn 1.100 đoạn mã sử dụng màu cứng (như `bg-white`, `text-slate-*`, `bg-[#f8fafc]`) rải rác trong 75+ files, giúp toàn bộ ứng dụng hỗ trợ Dark Mode hoàn hảo thông qua hệ thống CSS Variables (`index.css`).
- **Quy tắc thay thế:**
  - `bg-white` (card, panel) -> `bg-card`
  - `bg-white` (input, dropdown) -> `bg-input` / `bg-popover` (sẽ được thêm vào token)
  - `bg-[#f8fafc]` -> `bg-background`
  - `bg-slate-50` -> `bg-muted` hoặc `bg-muted/50`
  - `text-slate-700` / `text-slate-600` -> `text-foreground` / `text-muted-foreground`
  - `border-slate-200` / `border-slate-300` -> `border-border`

## 2. Guardrails (Vùng cấm KHÔNG được chạm vào)
Tuyệt đối **KHÔNG ĐƯỢC SỬA** các class sau vì chúng là chủ ý thiết kế trên nền tối (kính mờ, overlay):
- `CopyrightPage.tsx`: `bg-white text-primary`, `bg-white/20 text-white`
- `VegetableImportsPage.tsx`: `bg-white/10`, `bg-white/20`, `bg-white/30`
- `ExportOrdersPage.tsx`: `bg-white/10 text-white`
- `ProductSettingsPage.tsx` / `VegetableProductSettingsPage.tsx`: `hover:bg-white/10`
- `LoginPage.tsx`: `bg-white/70`, `bg-white/50`
- Các màu Status (`bg-emerald-50`, `bg-red-50`) KHÔNG đổi trừ khi có lệnh mới.
- Cẩn thận với Ternary operator (VD: `isActive ? 'bg-primary' : 'bg-white'`) -> Sửa thành `bg-card`.

## 3. Các Giai đoạn Thực thi (Tasks)

<!-- TASKS_START -->

### Task 1: CSS Foundation & Missing Tokens
- [x] **File:** `client/src/index.css`
- **Công việc:** Thêm các CSS Variables bị thiếu vào `:root` và `.dark` (như `--color-input`, `--color-popover`). Đảm bảo `@theme` block được map đầy đủ để Tailwind nhận diện được class `bg-input`, `bg-popover`. Bổ sung biến cho `soft-overlay` trong chế độ `.dark`.

### Task 2: Core UI Primitives
- [x] **Files:** `popover.tsx`, `command.tsx`, `MultiSearchableSelect.tsx`, `CreatableSearchableSelect.tsx`, `SearchableSelect.tsx`
- **Công việc:** Thay thế `bg-white` bằng `bg-popover` hoặc `bg-card`. Thay `text-slate-*` bằng các token `text-foreground`. Đảm bảo các hộp thoại nhỏ và menu xổ xuống tương thích Dark Mode.

### Task 3: Shared Components
- **Files:** Các components dùng chung như `DatePicker.tsx`, `DateRangePicker.tsx`, `PageHeader.tsx`, `ConfirmDialog.tsx`, `LoadingSkeleton.tsx`, `TimePicker24h.tsx`
- **Công việc:** Áp dụng toàn diện bộ token (`bg-card`, `bg-muted`, `border-border`, `text-foreground`) thay cho mã màu cứng.

### Task 4: Fix Dialog Wrappers (Critical)
- [x] **Files:** Toàn bộ ~18 files Dialog (VD: `CollectDebtDialog.tsx`, `WarehouseInventoryDialog.tsx`, `AddEditCustomerDialog.tsx`, v.v.)
- **Công việc:** Thay thế mã màu cứng `bg-[#f8fafc]` thành `bg-background` để hộp thoại đổi màu theo hệ thống. Sửa các class nền trắng thành `bg-card`.

### Task 5: Pages Module - Kho & Hàng Hóa
- [x] **Files:** `WarehousesPage.tsx`, `VegetableWarehousePage.tsx`, `ProductSettingsPage.tsx`
- **Công việc:** Thay đổi bề mặt nền trắng thành `bg-card`, cập nhật text và border cho đồng bộ. 
- **Note:** Bao gồm cả `VegetableProductSettingsPage.tsx`.

### Task 6: Pages Module - Đơn hàng & Giao vận
- [x] **Files:** `ExportOrdersPage.tsx`, `ImportOrdersPage.tsx`, `CreateDeliveryDialog.tsx`, v.v.
- **Công việc:** Thay `bg-white` thành `bg-card`, chú ý không đụng vào `bg-white/10` ở các ảnh overlay.
- **Note:** Bao gồm cả `VegetableImportsPage.tsx`, `DeliveryPage.tsx`, `VegetableDeliveryPage.tsx`.

### Task 7: Pages Module - Nhân sự & Kế toán
- [x] **Files:** `EmployeesPage.tsx`, `SalarySettingsPage.tsx`, `CustomerDebtPage.tsx`, v.v.
- **Công việc:** Cập nhật các bảng biểu, panel thông tin sang `bg-card` và `border-border`.
- **Note:** Bao gồm các trang HR, Kế toán, và Công nợ khách hàng.

## 4. Final Verification Wave
- **Kiểm tra biên dịch:** Chạy `npx tsc --noEmit` sau khi hoàn thành.
- **Kiểm tra giao diện:** Đảm bảo khi thêm class `dark` vào thẻ `html`, không còn bất kỳ mảng màu `#ffffff` chói lóa nào trên màn hình.
- [DECISION NEEDED] Chấp thuận hoàn thành toàn bộ công việc từ người dùng.