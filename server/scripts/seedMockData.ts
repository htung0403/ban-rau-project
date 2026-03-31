import { faker } from '@faker-js/faker';
import { supabaseService } from '../src/config/supabase';
import { format, subDays } from 'date-fns';

const PASSWORD_DEMO = 'password123';

async function createAuthUser(email: string, fullName: string, role: string) {
  try {
    const { data: users } = await supabaseService.auth.admin.listUsers();
    const existing = users?.users.find(u => u.email === email);
    
    let userId: string;
    if (existing) {
       userId = existing.id;
       console.log(`  - User ${email} exists: ${userId}`);
    } else {
       const { data, error } = await supabaseService.auth.admin.createUser({
         email,
         password: PASSWORD_DEMO,
         email_confirm: true,
         user_metadata: { full_name: fullName, role: role }
       });

       if (error) {
         console.error(`  ❌ Error creating auth user ${email}:`, error.message);
         return null;
       }
       userId = data.user.id;
       console.log(`  - Created user ${email}: ${userId}`);
    }
    
    const { error: profileError } = await supabaseService.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      role: role,
      is_active: true
    });

    if (profileError) console.error(`  ❌ Profile UPSERT failed for ${email}:`, profileError.message);
    
    return userId;
  } catch (e: any) {
    console.error(`  ❌ Exception in createAuthUser for ${email}:`, e.message);
    return null;
  }
}

async function seed() {
  console.log('🚀 Starting Seeding...');

  // 1. PROFILES
  console.log('--- 👤 Profiles ---');
  const staffIds: string[] = [];
  const driverIds: string[] = [];
  const customerUserIds: string[] = [];

  const roles = [
    { email: 'admin_demo@vuarau.com', name: 'Admin Demo', role: 'admin' },
    { email: 'kho1@vuarau.com', name: 'Nguyễn Kho 1', role: 'staff' },
    { email: 'kho2@vuarau.com', name: 'Trần Kho 2', role: 'staff' },
    { email: 'xe1@vuarau.com', name: 'Tài Xế 1', role: 'driver' },
    { email: 'xe2@vuarau.com', name: 'Tài Xế 2', role: 'driver' },
    { email: 'khach1@vuarau.com', name: 'Khách A', role: 'customer' },
    { email: 'khach2@vuarau.com', name: 'Khách B', role: 'customer' },
  ];

  for (const r of roles) {
    const id = await createAuthUser(r.email, r.name, r.role);
    if (id) {
       if (r.role === 'staff') staffIds.push(id);
       if (r.role === 'driver') driverIds.push(id);
       if (r.role === 'customer') customerUserIds.push(id);
    }
  }

  // 2. WAREHOUSES
  console.log('--- 🏘️ Warehouses ---');
  const { data: dbWarehouses, error: wError } = await supabaseService.from('warehouses').upsert([
    { name: 'Kho Thủ Đức', address: faker.location.streetAddress(), capacity: 2000, manager_id: staffIds[0] },
    { name: 'Kho Quận 12', address: faker.location.streetAddress(), capacity: 3000, manager_id: staffIds[1] || staffIds[0] }
  ], { onConflict: 'name' }).select();
  if (wError) console.error('  Warehouse Error:', wError.message);
  const warehouseIds = dbWarehouses?.map(w => w.id) || [];

  // 3. PRICE SETTINGS
  console.log('--- 💰 Price Settings ---');
  await supabaseService.from('price_settings').upsert([
    { setting_key: 'price_per_kg', value: 5000, description: 'Giá vận chuyển mỗi kg' },
    { setting_key: 'daily_wage_staff', value: 300000, description: 'Lương ngày nhân viên' },
    { setting_key: 'daily_wage_driver', value: 450000, description: 'Lương ngày tài xế' }
  ], { onConflict: 'setting_key' });

  // 4. CUSTOMERS
  console.log('--- 👥 Customers ---');
  const customerData = customerUserIds.map((uid, i) => ({
    user_id: uid,
    name: i === 0 ? 'Khách A' : 'Khách B',
    phone: faker.phone.number(),
    address: faker.location.city(),
    debt: 0
  }));
  const { data: dbCustomers, error: cError } = await supabaseService.from('customers').upsert(customerData, { onConflict: 'user_id' }).select();
  if (cError) console.error('  Customer Error:', cError.message);
  const customerIds = dbCustomers?.map(c => c.id) || [];

  // 5. VEHICLES
  console.log('--- 🚛 Vehicles ---');
  const vehicleData = driverIds.map((did, i) => ({
    license_plate: `51C-0000${i+1}`,
    vehicle_type: 'Tải 2.5 tấn',
    driver_id: did,
    status: 'available'
  }));
  const { data: dbVehicles, error: vError } = await supabaseService.from('vehicles').upsert(vehicleData, { onConflict: 'license_plate' }).select();
  if (vError) console.error('  Vehicle Error:', vError.message);
  const vehicleIds = dbVehicles?.map(v => v.id) || [];

  // 6. IMPORT ORDERS
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
      customer_id: customerIds[0]
    });
  }
  const { error: iError } = await supabaseService.from('import_orders').insert(importOrders);
  if (iError) console.error('  Import Error:', iError.message);

  // 7. ATTENDANCE
  console.log('--- 📋 Attendance ---');
  const attendance = [];
  const staffAndDrivers = [...staffIds, ...driverIds];
  for (const sid of staffAndDrivers) {
     for (let day = 0; day < 5; day++) {
       attendance.push({
         employee_id: sid,
         work_date: format(subDays(new Date(), day), 'yyyy-MM-dd'),
         is_present: true
       });
     }
  }
  const { error: attError } = await supabaseService.from('attendance').upsert(attendance, { onConflict: 'employee_id,work_date' });
  if (attError) console.error('  Attendance Error:', attError.message);

  console.log('✅ Seeding Done!');
}

seed().catch(err => {
  console.error('❌ SEEDING FAILED:', err);
  process.exit(1);
});
