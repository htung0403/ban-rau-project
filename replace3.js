import fs from 'fs';
const file = 'client/src/pages/vehicles/payment-collections/dialogs/CreateEditPaymentDialog.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldFilter = `      .filter(d => 
        d.status !== 'da_giao' && 
        d.delivery_vehicles?.some(v => v.driver_id === user?.id)
      )`;
const newFilter = `      .filter(d => 
        d.status !== 'da_giao' && 
        d.delivery_vehicles?.some(v => v.driver_id === user?.id || v.vehicles?.in_charge_id === user?.id)
      )`;

const oldMap = `        const myAssignment = d.delivery_vehicles?.find(v => v.driver_id === user?.id);`;
const newMap = `        const myAssignment = d.delivery_vehicles?.find(v => v.driver_id === user?.id || v.vehicles?.in_charge_id === user?.id);`;

code = code.replace(oldFilter, newFilter);
code = code.replace(oldMap, newMap);

fs.writeFileSync(file, code);
console.log("Replaced frontend file");
