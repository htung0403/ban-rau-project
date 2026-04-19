import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';
import { supabaseService } from '../src/config/supabase';
import { format, subDays } from 'date-fns';
import { hashPassword } from '../src/utils/password';

const PASSWORD_DEMO = 'password123';

async function ensureProfileWithLogin(
  email: string,
  phone: string,
  fullName: string,
  role: string
): Promise<string | null> {
  try {
    const emailLower = email.trim().toLowerCase();
    const password_hash = await hashPassword(PASSWORD_DEMO);

    const byEmail = await supabaseService.from('profiles').select('id').eq('email', emailLower).maybeSingle();
    if (byEmail.data?.id) {
      await supabaseService
        .from('profiles')
        .update({ full_name: fullName, role, phone, password_hash, is_active: true, personal_email: emailLower })
        .eq('id', byEmail.data.id);
      console.log(`  - Profile ${email} updated: ${byEmail.data.id}`);
      return byEmail.data.id;
    }

    const byPhone = await supabaseService.from('profiles').select('id').eq('phone', phone).maybeSingle();
    if (byPhone.data?.id) {
      await supabaseService
        .from('profiles')
        .update({
          full_name: fullName,
          role,
          email: emailLower,
          personal_email: emailLower,
          password_hash,
          is_active: true,
        })
        .eq('id', byPhone.data.id);
      console.log(`  - Profile phone ${phone} updated: ${byPhone.data.id}`);
      return byPhone.data.id;
    }

    const id = randomUUID();
    const { error } = await supabaseService.from('profiles').insert({
      id,
      full_name: fullName,
      role,
      phone,
      email: emailLower,
      personal_email: emailLower,
      password_hash,
      is_active: true,
    });

    if (error) {
      console.error(`  ❌ Error creating profile ${email}:`, error.message);
      return null;
    }
    console.log(`  - Created profile ${email} / ${phone}: ${id}`);
    return id;
  } catch (e: any) {
    console.error(`  ❌ Exception for ${email}:`, e.message);
    return null;
  }
}

async function seed() {
  console.log('🚀 Starting Seeding...');

  console.log('--- 👤 Profiles (đăng nhập: SĐT + mật khẩu password123) ---');
  const staffIds: string[] = [];
  const driverIds: string[] = [];
  const customerUserIds: string[] = [];

  const roles = [
    { email: 'admin_demo@vuarau.com', phone: '0900000001', name: 'Admin Demo', role: 'admin' },
    { email: 'kho1@vuarau.com', phone: '0900000002', name: 'Nguyễn Kho 1', role: 'staff' },
    { email: 'kho2@vuarau.com', phone: '0900000003', name: 'Trần Kho 2', role: 'staff' },
    { email: 'xe1@vuarau.com', phone: '0900000004', name: 'Tài Xế 1', role: 'driver' },
    { email: 'xe2@vuarau.com', phone: '0900000005', name: 'Tài Xế 2', role: 'driver' },
    { email: 'khach1@vuarau.com', phone: '0900000101', name: 'Khách A', role: 'customer' },
    { email: 'khach2@vuarau.com', phone: '0900000102', name: 'Khách B', role: 'customer' },
  ];

  for (const r of roles) {
    const id = await ensureProfileWithLogin(r.email, r.phone, r.name, r.role);
    if (id) {
      if (r.role === 'staff') staffIds.push(id);
      if (r.role === 'driver') driverIds.push(id);
      if (r.role === 'customer') customerUserIds.push(id);
    }
  }

  console.log('--- 🏘️ Warehouses ---');
  const { data: dbWarehouses, error: wError } = await supabaseService.from('warehouses').upsert(
    [
      { name: 'Kho Thủ Đức', address: faker.location.streetAddress(), capacity: 2000, manager_id: staffIds[0] },
      {
        name: 'Kho Quận 12',
        address: faker.location.streetAddress(),
        capacity: 3000,
        manager_id: staffIds[1] || staffIds[0],
      },
    ],
    { onConflict: 'name' }
  ).select();
  if (wError) console.error('  Warehouse Error:', wError.message);
  const warehouseIds = dbWarehouses?.map((w) => w.id) || [];

  console.log('--- 💰 Price Settings ---');
  await supabaseService.from('price_settings').upsert(
    [
      { setting_key: 'price_per_kg', value: 5000, description: 'Giá vận chuyển mỗi kg' },
      { setting_key: 'daily_wage_staff', value: 300000, description: 'Lương ngày nhân viên' },
      { setting_key: 'daily_wage_driver', value: 450000, description: 'Lương ngày tài xế' },
    ],
    { onConflict: 'setting_key' }
  );

  console.log('--- 👥 Customers ---');
  const customerData = customerUserIds.map((uid, i) => ({
    user_id: uid,
    name: i === 0 ? 'Khách A' : 'Khách B',
    phone: i === 0 ? '0900000101' : '0900000102',
    address: faker.location.city(),
    debt: 0,
  }));
  const { data: dbCustomers, error: cError } = await supabaseService
    .from('customers')
    .upsert(customerData, { onConflict: 'user_id' })
    .select();
  if (cError) console.error('  Customer Error:', cError.message);
  const customerIds = dbCustomers?.map((c) => c.id) || [];

  console.log('--- 🚛 Vehicles ---');
  const vehicleData = driverIds.map((did, i) => ({
    license_plate: `51C-0000${i + 1}`,
    vehicle_type: 'Tải 2.5 tấn',
    driver_id: did,
    status: 'available',
  }));
  const { data: dbVehicles, error: vError } = await supabaseService
    .from('vehicles')
    .upsert(vehicleData, { onConflict: 'license_plate' })
    .select();
  if (vError) console.error('  Vehicle Error:', vError.message);
  const vehicleIds = dbVehicles?.map((v) => v.id) || [];

  console.log('--- 📦 Import Orders ---');
  const importOrders = [];
  for (let i = 0; i < 10; i++) {
    importOrders.push({
      order_code: `IM-${faker.string.alphanumeric(5).toUpperCase()}`,
      order_date: format(faker.date.recent({ days: 10 }), 'yyyy-MM-dd'),
      order_time: '08:30:00',
      sender_name: faker.person.fullName(),
      receiver_name: faker.person.fullName(),
      receiver_phone: faker.phone.number(),
      receiver_address: faker.location.streetAddress(),
      package_type: 'thùng',
      weight_kg: faker.number.int({ min: 10, max: 100 }),
      quantity: faker.number.int({ min: 1, max: 50 }),
      unit_price: 5000,
      received_by: staffIds[0],
      warehouse_id: warehouseIds[0],
      status: 'pending',
      customer_id: customerIds[0],
    });
  }
  const { error: iError } = await supabaseService.from('import_orders').insert(importOrders);
  if (iError) console.error('  Import Error:', iError.message);

  console.log('--- 📋 Attendance ---');
  const attendance = [];
  const staffAndDrivers = [...staffIds, ...driverIds];
  for (const sid of staffAndDrivers) {
    for (let day = 0; day < 5; day++) {
      attendance.push({
        employee_id: sid,
        work_date: format(subDays(new Date(), day), 'yyyy-MM-dd'),
        is_present: true,
      });
    }
  }
  const { error: attError } = await supabaseService
    .from('attendance')
    .upsert(attendance, { onConflict: 'employee_id,work_date' });
  if (attError) console.error('  Attendance Error:', attError.message);

  console.log('✅ Seeding Done!');
}

seed().catch((err) => {
  console.error('❌ SEEDING FAILED:', err);
  process.exit(1);
});
