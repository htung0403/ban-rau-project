import fs from 'fs';
const file = 'server/src/modules/delivery/delivery.service.ts';
let code = fs.readFileSync(file, 'utf8');

const parts = code.split("delivery_vehicles(*, vehicles(license_plate))");
if(parts.length > 1) {
  code = parts.join("delivery_vehicles(*, vehicles(license_plate, in_charge_id))");
  fs.writeFileSync(file, code);
  console.log("Replaced delivery.service.ts");
} else {
  console.log("Could not find in delivery.service.ts");
}
