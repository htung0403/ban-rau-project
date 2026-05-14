import { DeliveryNoteGenerator } from './utils/deliveryNoteGenerator';
import fs from 'fs';
import path from 'path';

async function test() {
  const supplierData = {
    supplierName: 'Dũng Hiển',
    date: '15/05/2026',
    items: [
      { taiRank: 2, quantity: 60, productName: 'Két Cà Chua', senderName: 'Hằng Bên' },
      { taiRank: 2, quantity: 65, productName: 'Két Cà Chua', senderName: 'Hằng Bên' },
      { taiRank: 3, quantity: 20, productName: 'Két Cà Chua', senderName: 'Định' },
      { taiRank: 1, quantity: 10, productName: 'Rau Muống', senderName: 'Lan' },
      { taiRank: 1, quantity: 15, productName: 'Rau Muống', senderName: 'Huệ' },
    ]
  };

  const senderData = {
    senderName: 'Hằng Bên',
    date: '15/05/2026',
    items: [
      { taiRank: 2, quantity: 60, productName: 'Két Cà Chua', depotName: 'Dũng Hiển' },
      { taiRank: 2, quantity: 65, productName: 'Két Cà Chua', depotName: 'Dũng Hiển' },
      { taiRank: 4, quantity: 30, productName: 'Bầu', depotName: 'Chợ Mới' },
    ]
  };

  try {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    const supplierBuffer = await DeliveryNoteGenerator.generateSupplierSummaryPng(supplierData);
    fs.writeFileSync(path.join(tmpDir, 'test-supplier-summary-grouped.png'), supplierBuffer);
    
    const senderBuffer = await DeliveryNoteGenerator.generateSenderSummaryPng(senderData);
    fs.writeFileSync(path.join(tmpDir, 'test-sender-summary-grouped.png'), senderBuffer);
    
    console.log('Saved test images to tmp folder');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
