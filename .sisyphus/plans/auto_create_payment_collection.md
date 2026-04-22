## Goal
Tự động tạo phiếu thu (payment collection) cho tài xế dựa trên số tiền ở AssignVehicleDialog khi phân giao đơn hàng ở DeliveryPage hoặc VegetableDeliveryPage.

## Technical Approach
Việc phân giao đơn hàng được xử lý thông qua `DeliveryService.assignVehicles` ở phía backend. Do đó, việc tự động tạo phiếu thu nên được thực hiện ở đây để đảm bảo tính nhất quán dữ liệu bất kể request được gửi từ màn hình nào.
1. Cập nhật `server/src/modules/delivery/delivery.service.ts`:
   - Bên trong hàm `assignVehicles`, sau khi insert vào bảng `delivery_vehicles` thành công, ta duyệt qua các bản ghi vừa insert (`data`).
   - Lấy `customer_id` từ `delivery_orders` (kết hợp với `import_orders` hoặc `vegetable_orders`).
   - Với mỗi `assignment` có `expected_amount > 0`:
     - Tự động insert một bản ghi mới vào bảng `payment_collections` với các thông tin:
       - `delivery_order_id`: `deliveryId`
       - `customer_id`: `customerId`
       - `driver_id`: `assignment.driver_id`
       - `vehicle_id`: `assignment.vehicle_id`
       - `expected_amount`: `assignment.expected_amount`
       - `collected_amount`: `assignment.expected_amount` (mặc định cho bằng `expected_amount` ban đầu để tài xế có thể sửa lại nếu cần hoặc để mặc định là đã thu đủ)
       - `collected_at`: `new Date().toISOString()`
       - `status`: `'draft'`
   - Catch lỗi khi insert vào `payment_collections` (ví dụ lỗi duplicate `unique_active_collection`) để không làm gián đoạn luồng assign xe chính.

## Tasks
1. Mở file `server/src/modules/delivery/delivery.service.ts`.
2. Tìm method `assignVehicles`.
3. Sau đoạn code insert vào `delivery_vehicles` (`const { data, error } = await supabaseService.from('delivery_vehicles').insert(insertData).select();`), thêm logic tự động tạo phiếu thu như mô tả ở Technical Approach.
4. Kiểm tra và đảm bảo bắt lỗi (`try...catch`) khi thực hiện `supabaseService.from('payment_collections').insert(...)` để không throw error ảnh hưởng luồng phân xe, in ra console `console.error('Failed to auto-create payment collection for driver', assignment.driver_id, pcError);`.

## Final Verification Wave
- Test phân giao một xe với expected_amount > 0 và kiểm tra xem có 1 phiếu thu nháp mới được tạo trong bảng `payment_collections` không.
