import sharp from 'sharp';

export interface DeliveryNoteData {
  shopName: string;
  customerName: string;
  deliveryDate: string;
  staffName: string;
  licensePlate: string;
  deliveryTime: string;
  quantity: number;
  productName: string;
  price: number;
  total: number;
}

export class DeliveryNoteGenerator {
  /**
   * Generates a PNG buffer of a delivery note based on SVG template.
   * Matches the user-provided image layout.
   */
  static async generatePng(data: DeliveryNoteData): Promise<Buffer> {
    const width = 800;
    const height = 250;
    const rowHeight = 40;
    const fontSize = 16;
    const boldFontSize = 18;

    // Sanitize data for SVG
    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&apos;';
          default: return c;
        }
      });
    };

    const d = {
      shopName: escapeXml(data.shopName),
      customerName: escapeXml(data.customerName),
      deliveryDate: escapeXml(data.deliveryDate),
      staffName: escapeXml(data.staffName),
      licensePlate: escapeXml(data.licensePlate),
      deliveryTime: escapeXml(data.deliveryTime),
      productName: escapeXml(data.productName),
      quantity: data.quantity,
      price: data.price.toLocaleString('vi-VN'),
      total: data.total.toLocaleString('vi-VN'),
    };

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
        
        <!-- Header -->
        <rect x="10" y="10" width="${width - 20}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="${width / 2}" y="${10 + rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">
          phiếu giao hàng ${d.shopName}
        </text>

        <!-- Customer -->
        <rect x="10" y="${10 + rowHeight}" width="${width - 20}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="${width / 2}" y="${10 + rowHeight + rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">
          Khách Hàng : ${d.customerName}
        </text>

        <!-- Date & Staff -->
        <rect x="10" y="${10 + 2 * rowHeight}" width="${(width - 20) / 2}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="20" y="${10 + 2 * rowHeight + rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}">
          Ngày Giao: ${d.deliveryDate}
        </text>

        <rect x="${10 + (width - 20) / 2}" y="${10 + 2 * rowHeight}" width="${(width - 20) / 2}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="${20 + (width - 20) / 2}" y="${10 + 2 * rowHeight + rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}">
          Tên NV: ${d.staffName}    SỐ Xe ${d.licensePlate}
        </text>

        <!-- Table Header -->
        <g transform="translate(10, ${10 + 3 * rowHeight})">
          <rect x="0" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="50" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">Giờ Giao</text>

          <rect x="100" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="150" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">Số Lượng</text>

          <rect x="200" y="0" width="200" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="300" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">Tên Hàng</text>

          <rect x="400" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="475" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">Giá</text>

          <rect x="550" y="0" width="${width - 20 - 550}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="${550 + (width - 20 - 550) / 2}" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">Thành Tiền</text>
        </g>

        <!-- Table Row -->
        <g transform="translate(10, ${10 + 4 * rowHeight})">
          <rect x="0" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="50" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">${d.deliveryTime}</text>

          <rect x="100" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="150" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">${d.quantity}</text>

          <rect x="200" y="0" width="200" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="300" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">${d.productName}</text>

          <rect x="400" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="475" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">${d.price}</text>

          <rect x="550" y="0" width="${width - 20 - 550}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="${550 + (width - 20 - 550) / 2}" y="${rowHeight / 2 + 6}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle">${d.total}</text>
        </g>
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }
}
