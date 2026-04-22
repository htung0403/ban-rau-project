const fs = require('fs');
const path = 'D:\\job-banrau\\client\\src\\pages\\delivery\\dialogs\\OrderImagesDialog.tsx';
let content = fs.readFileSync(path, 'utf8');

const old1 = `    if (linkedImportOrder?.receipt_image_url) receiptImages.push(linkedImportOrder.receipt_image_url);
    if (linkedVegetableOrder?.receipt_image_url) receiptImages.push(linkedVegetableOrder.receipt_image_url);`;
    
const new1 = `    if (linkedImportOrder?.receipt_image_url) receiptImages.push(linkedImportOrder.receipt_image_url);
    if (linkedImportOrder?.receipt_image_urls) receiptImages.push(...linkedImportOrder.receipt_image_urls);
    if (linkedVegetableOrder?.receipt_image_url) receiptImages.push(linkedVegetableOrder.receipt_image_url);
    if (linkedVegetableOrder?.receipt_image_urls) receiptImages.push(...linkedVegetableOrder.receipt_image_urls);`;

content = content.replace(old1, new1);

const old2 = `    if (iOrder.receipt_image_url) receiptImages.push(iOrder.receipt_image_url);`;
const new2 = `    if (iOrder.receipt_image_url) receiptImages.push(iOrder.receipt_image_url);
    if (iOrder.receipt_image_urls) receiptImages.push(...iOrder.receipt_image_urls);`;

content = content.replace(old2, new2);

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced OrderImagesDialog');