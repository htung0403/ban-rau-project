import fs from 'fs';
const file = 'server/src/modules/vehicles/payment-collections.service.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCode = `    // 2. Get vehicle_id and expected_amount from delivery_vehicles where assigned to this driver
    const { data: dvData, error: dvError } = await supabaseService
      .from('delivery_vehicles')
      .select('vehicle_id, expected_amount')
      .eq('delivery_order_id', data.deliveryOrderId)
      .eq('driver_id', driverId)
      .limit(1)
      .maybeSingle();

    if (dvError || !dvData) throw new Error('Bạn không được giao đơn hàng này');`;

const newCode = `    // 2. Get vehicle_id and expected_amount from delivery_vehicles where assigned to this driver or loader
    const { data: dvDataList, error: dvError } = await supabaseService
      .from('delivery_vehicles')
      .select('vehicle_id, expected_amount, driver_id, vehicles(in_charge_id)')
      .eq('delivery_order_id', data.deliveryOrderId);

    if (dvError || !dvDataList || dvDataList.length === 0) throw new Error('Lỗi truy xuất xe giao hàng');

    const dvData = dvDataList.find((dv: any) => dv.driver_id === driverId || dv.vehicles?.in_charge_id === driverId);

    if (!dvData) throw new Error('Bạn không được giao đơn hàng này');`;

// Let's use regex or split to avoid exact match errors with encoding
const parts = code.split("    // 2. Get vehicle_id and expected_amount from delivery_vehicles");
if(parts.length > 1) {
  const rest = parts[1].split("    const ioOrVeg: any = doData.vegetable_orders || doData.import_orders;");
  code = parts[0] + newCode + "\n\n    const ioOrVeg: any = doData.vegetable_orders || doData.import_orders;" + rest[1];
  fs.writeFileSync(file, code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the hook to replace");
}
