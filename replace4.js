import fs from 'fs';
const file = 'client/src/pages/vehicles/payment-collections/dialogs/CreateEditPaymentDialog.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldMap = `.map(d => {
        const myAssignment = d.delivery_vehicles?.find(v => v.driver_id === user?.id || v.vehicles?.in_charge_id === user?.id);
        return {
          id: d.id,
          code: d.import_orders?.order_code || 'N/A',
          customer: d.import_orders?.customers?.name || 'V Danh',
          productName: d.product_name,
          quantity: myAssignment?.assigned_quantity ?? d.total_quantity,
          amount: myAssignment?.expected_amount ?? d.import_orders?.total_amount ?? 0
        };
      });`;

const newMap = `.map(d => {
        const myAssignment = d.delivery_vehicles?.find(v => v.driver_id === user?.id || v.vehicles?.in_charge_id === user?.id);
        return {
          id: d.id,
          code: d.import_orders?.order_code || d.vegetable_orders?.order_code || 'N/A',
          customer: d.import_orders?.customers?.name || d.vegetable_orders?.customers?.name || 'Vô Danh',
          productName: d.product_name,
          quantity: myAssignment?.assigned_quantity ?? d.total_quantity,
          amount: myAssignment?.expected_amount ?? d.import_orders?.total_amount ?? d.vegetable_orders?.total_amount ?? 0
        };
      });`;

// Because of the strange character in "V Danh", I'll just use regex or split on parts
const parts = code.split("code: d.import_orders?.order_code || 'N/A',");
if(parts.length > 1) {
  const p1 = parts[0];
  const p2 = parts[1].split("amount: myAssignment?.expected_amount ?? d.import_orders?.total_amount ?? 0")[1];
  
  const finalCode = p1 + "code: d.import_orders?.order_code || d.vegetable_orders?.order_code || 'N/A',\n" +
  "          customer: d.import_orders?.customers?.name || d.vegetable_orders?.customers?.name || 'Vô Danh',\n" +
  "          productName: d.product_name,\n" +
  "          quantity: myAssignment?.assigned_quantity ?? d.total_quantity,\n" +
  "          amount: myAssignment?.expected_amount ?? d.import_orders?.total_amount ?? d.vegetable_orders?.total_amount ?? 0" + p2;
  
  fs.writeFileSync(file, finalCode);
  console.log("Replaced frontend mapping");
} else {
  console.log("Failed to find code segment");
}
