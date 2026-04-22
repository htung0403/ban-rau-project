const fs = require('fs');

const fixGetOrderPreviewImage = (file) => {
  let code = fs.readFileSync(file, 'utf8');
  const oldCode = `const getOrderPreviewImage = (order: any) => {
  if (!order) return null;
  const directImage = order.image_url;
  if (directImage) return directImage;`;
  
  const newCode = `const getOrderPreviewImage = (order: any) => {
  if (!order) return null;
  const directImage = order.image_url;
  if (directImage) return directImage;
  if (order.image_urls && Array.isArray(order.image_urls) && order.image_urls.length > 0) return order.image_urls[0];`;

  if (code.includes(oldCode)) {
    fs.writeFileSync(file, code.replace(oldCode, newCode));
    console.log('Fixed', file);
  } else {
    console.log('Could not find in', file);
  }
};

fixGetOrderPreviewImage('D:/job-banrau/client/src/pages/delivery/DeliveryPage.tsx');
fixGetOrderPreviewImage('D:/job-banrau/client/src/pages/delivery/VegetableDeliveryPage.tsx');
