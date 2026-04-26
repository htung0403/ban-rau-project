import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

// ==========================================
// 1. CẤU HÌNH CỦA BẠN (CẦN ĐIỀN THÔNG TIN VÀO ĐÂY)
// ==========================================
const SUPABASE_URL = 'https://taefcjrbvefqzfnovlda.supabase.co'; // Thay bằng Project URL của bạn
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWZjanJidmVmcXpmbm92bGRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg4NDUxMywiZXhwIjoyMDkwNDYwNTEzfQ.X177Lqrr-BiK4SwGEoEedpNAINu7i_e-f6flfk904bo'; // Thay bằng service_role key (Trong Project Settings > API)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

cloudinary.config({
  cloud_name: 'diwmkhk0g', // Thay bằng Cloud name
  api_key: '679633132267696',       // Thay bằng API Key
  api_secret: 'QZ9pGYa6eX4SeJbKm4u7ApKTMHc'  // Thay bằng API Secret
});

// ==========================================
// 2. CẤU TRÚC DATABASE VÀ FOLDER CLOUDINARY
// ==========================================
// Đã map chuẩn 100% với cấu trúc thư mục trên Supabase Storage hiện tại của bạn
const SCHEMA = [
  { table: 'profiles', columns: ['avatar_url'], folder: 'avatars/profiles' },
  { table: 'expenses', columns: ['image_urls'], folder: 'expenses/receipts' },
  { table: 'import_orders', columns: ['receipt_image_url', 'receipt_image_urls'], folder: 'import-orders/orders' },
  { table: 'import_order_items', columns: ['image_url', 'image_urls'], folder: 'import-orders/items' },
  { table: 'vegetable_orders', columns: ['receipt_image_url', 'receipt_image_urls'], folder: 'import-orders/orders' },
  { table: 'vegetable_order_items', columns: ['image_url', 'image_urls'], folder: 'import-orders/items' },
  { table: 'delivery_orders', columns: ['image_url', 'image_urls'], folder: 'import-orders/delivery-orders' },
  { table: 'export_orders', columns: ['image_url', 'image_urls'], folder: 'import-orders/export-orders' },
  { table: 'payment_collections', columns: ['image_url'], folder: 'import-orders/payment-collections' },
  { table: 'delivery_vehicles', columns: ['image_urls'], folder: 'import-orders/delivery-orders' }
];

// ==========================================
// 3. LOGIC XỬ LÝ (KÈM BỘ NHỚ TẠM CHỐNG TRÙNG LẶP)
// ==========================================
const urlCache = new Map(); // Lưu cache các link đã up thành công

async function uploadToCloudinary(url, folderName) {
  // Bỏ qua nếu url rỗng hoặc không phải là link của Supabase
  if (!url || !url.includes('supabase.co')) return url;

  // NẾU LINK NÀY ĐÃ TỪNG UPLOAD RỒI -> LẤY LUÔN LINK CLOUDINARY ĐÃ LƯU, KHÔNG UPLOAD LẠI
  if (urlCache.has(url)) {
    return urlCache.get(url);
  }

  try {
    const res = await cloudinary.uploader.upload(url, {
      folder: folderName, // Lưu ảnh đúng vào folder giống Supabase cũ
      format: 'webp',     // Ép kiểu WebP siêu nhẹ
      quality: 'auto'     // Tự động nén chất lượng mà không nhòe
    });
    
    // Đánh dấu đã up thành công để lần sau gặp lại ảnh này không up nữa
    urlCache.set(url, res.secure_url);

    return res.secure_url;
  } catch (error) {
    console.error(`❌ Lỗi upload ảnh: ${url}`, error.message);
    return url; // Nếu lỗi xảy ra, giữ nguyên link cũ để không làm mất dữ liệu
  }
}

async function runMigration() {
  console.log('🚀 BẮT ĐẦU MIGRATE TOÀN BỘ ẢNH SANG CLOUDINARY...');

  for (const { table, columns, folder } of SCHEMA) {
    console.log(`\n--- Đang quét dữ liệu bảng: [${table}] ---`);

    // Lấy tất cả dòng có dữ liệu từ các bảng
    const { data: rows, error } = await supabase.from(table).select(`id, ${columns.join(', ')}`);

    if (error) {
      console.error(`❌ Lỗi lấy dữ liệu bảng ${table}:`, error.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`Bảng [${table}] trống, bỏ qua.`);
      continue;
    }

    for (const row of rows) {
      let hasChanges = false;
      const updatedData = {};

      for (const col of columns) {
        const val = row[col];
        if (!val) continue;

        if (Array.isArray(val)) {
          // Xử lý cột dạng Mảng (ví dụ: image_urls)
          const hasSupabaseUrl = val.some(u => u && u.includes('supabase.co'));
          if (hasSupabaseUrl) {
            console.log(`🔄 [${table}] ID ${row.id}: Kéo mảng ảnh từ cột [${col}]...`);
            const newArray = [];
            for (const oldUrl of val) {
              newArray.push(await uploadToCloudinary(oldUrl, folder));
            }
            updatedData[col] = newArray;
            hasChanges = true;
          }
        } else if (typeof val === 'string' && val.includes('supabase.co')) {
          // Xử lý cột dạng String (ví dụ: image_url, avatar_url)
          console.log(`🔄 [${table}] ID ${row.id}: Kéo ảnh từ cột [${col}]...`);
          updatedData[col] = await uploadToCloudinary(val, folder);
          hasChanges = true;
        }
      }

      // Update lại Database nếu có URL bị thay đổi
      if (hasChanges) {
        const { error: updateErr } = await supabase.from(table).update(updatedData).eq('id', row.id);
        if (updateErr) {
          console.error(`❌ Lỗi update Database cho ID ${row.id}:`, updateErr.message);
        } else {
          console.log(`✅ Cập nhật thành công ID ${row.id}`);
        }
      }
    }
  }

  console.log('\n🎉 HOÀN TẤT TOÀN BỘ QUÁ TRÌNH MIGRATE TỪ SUPABASE SANG CLOUDINARY!');
}

runMigration();