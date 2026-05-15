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

export interface SummaryNoteItem {
  deliveryTime: string;
  licensePlate: string;
  staffName: string;
  quantity: number;
  productName: string;
  price: number;
  total: number;
}

export interface SummaryNoteData {
  shopName: string;
  customerName: string;
  deliveryDate: string;
  items: SummaryNoteItem[];
}

export interface SupplierSummaryItem {
  taiRank: number;
  licensePlate: string;
  quantity: number;
  productName: string;
  senderName: string;
  price: number;
  total: number;
}

export interface SupplierSummaryData {
  supplierName: string;
  date: string;
  items: SupplierSummaryItem[];
}

export interface SenderSummaryItem {
  taiRank: number;
  licensePlate: string;
  quantity: number;
  productName: string;
  depotName: string;
}

export interface SenderSummaryData {
  senderName: string;
  date: string;
  items: SenderSummaryItem[];
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
        <text x="${width / 2}" y="${10 + rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">
          Phiếu giao hàng Nhà xe ${d.shopName}
        </text>

        <!-- Customer -->
        <rect x="10" y="${10 + rowHeight}" width="${width - 20}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="${width / 2}" y="${10 + rowHeight + rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">
          Khách Hàng : ${d.customerName}
        </text>

        <!-- Date & Staff -->
        <rect x="10" y="${10 + 2 * rowHeight}" width="${(width - 20) / 2}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="20" y="${10 + 2 * rowHeight + rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">
          Ngày Giao: ${d.deliveryDate}
        </text>

        <rect x="${10 + (width - 20) / 2}" y="${10 + 2 * rowHeight}" width="${(width - 20) / 2}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
        <text x="${20 + (width - 20) / 2}" y="${10 + 2 * rowHeight + rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">
          Tên NV: ${d.staffName}
        </text>
        <text x="${width - 20}" y="${10 + 2 * rowHeight + rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="end">
          Xe ${d.licensePlate}
        </text>

        <!-- Table Header -->
        <g transform="translate(10, ${10 + 3 * rowHeight})">
          <rect x="0" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="50" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">Giờ Giao</text>

          <rect x="100" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="150" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">Số Lượng</text>

          <rect x="200" y="0" width="200" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="300" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">Tên Hàng</text>

          <rect x="400" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="475" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">Giá</text>

          <rect x="550" y="0" width="${width - 20 - 550}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="${550 + (width - 20 - 550) / 2}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">Thành Tiền</text>
        </g>

        <!-- Table Row -->
        <g transform="translate(10, ${10 + 4 * rowHeight})">
          <rect x="0" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="50" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${d.deliveryTime}</text>

          <rect x="100" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="150" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${d.quantity}</text>

          <rect x="200" y="0" width="200" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="300" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${d.productName}</text>

          <rect x="400" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="475" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${d.price}</text>

          <rect x="550" y="0" width="${width - 20 - 550}" height="${rowHeight}" fill="none" stroke="black" stroke-width="1" />
          <text x="${550 + (width - 20 - 550) / 2}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${d.total}</text>
        </g>
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generates a summary PNG with multiple rows for daily reporting.
   */
  static async generateSummaryPng(data: SummaryNoteData): Promise<Buffer> {
    const width = 1000;
    const rowHeight = 40;
    const headerHeight = 160; // Shop name + Title + Customer + Date info
    const height = headerHeight + (data.items.length + 1) * rowHeight + 20;
    const fontSize = 14;

    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;';
          case '"': return '&quot;'; case "'": return '&apos;'; default: return c;
        }
      });
    };

    const d = {
      shopName: escapeXml(data.shopName),
      customerName: escapeXml(data.customerName),
      deliveryDate: escapeXml(data.deliveryDate),
    };

    let rowsSvg = '';
    data.items.forEach((item, i) => {
      const y = headerHeight + (i + 1) * rowHeight;
      rowsSvg += `
        <g transform="translate(10, ${y})">
          <rect x="0" y="0" width="80" height="${rowHeight}" fill="none" stroke="black" />
          <text x="40" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${escapeXml(item.deliveryTime)}</text>
          
          <rect x="80" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" />
          <text x="130" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${escapeXml(item.licensePlate)}</text>
          
          <rect x="180" y="0" width="180" height="${rowHeight}" fill="none" stroke="black" />
          <text x="190" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.staffName)}</text>
          
          <rect x="360" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" />
          <text x="410" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${item.quantity}</text>
          
          <rect x="460" y="0" width="200" height="${rowHeight}" fill="none" stroke="black" />
          <text x="470" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.productName)}</text>
          
          <rect x="660" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" />
          <text x="800" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="end">${item.price.toLocaleString('vi-VN')}</text>
          
          <rect x="810" y="0" width="${width - 20 - 810}" height="${rowHeight}" fill="none" stroke="black" />
          <text x="${width - 30}" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="end">${item.total.toLocaleString('vi-VN')}</text>
        </g>
      `;
    });

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
        
        <!-- Header -->
        <rect x="10" y="10" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="35" font-family="'DejaVu Sans', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">Nhà xe ${d.shopName}</text>
        
        <rect x="10" y="50" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="75" font-family="'DejaVu Sans', sans-serif" font-size="18" font-weight="bold" text-anchor="middle">Phiếu Tổng hàng đã giao trong ngày</text>
        
        <rect x="10" y="90" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="115" font-family="'DejaVu Sans', sans-serif" font-size="16" text-anchor="middle">Khách Nhận : ${d.customerName}</text>
        
        <rect x="10" y="130" width="${width - 20}" height="30" fill="none" stroke="black" />
        <text x="${width / 2}" y="150" font-family="'DejaVu Sans', sans-serif" font-size="14" text-anchor="middle">Ngày ${d.deliveryDate}</text>

        <!-- Table Columns -->
        <g transform="translate(10, ${headerHeight})">
          <rect x="0" y="0" width="80" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="40" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">giờ giao</text>
          
          <rect x="80" y="0" width="100" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="130" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">số xe</text>
          
          <rect x="180" y="0" width="180" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="270" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">nhân viên giao</text>
          
          <rect x="360" y="0" width="100" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="410" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">số lượng</text>
          
          <rect x="460" y="0" width="200" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="560" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">tên hàng</text>
          
          <rect x="660" y="0" width="150" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="735" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Giá</text>
          
          <rect x="810" y="0" width="${width - 20 - 810}" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="${810 + (width - 20 - 810) / 2}" y="${rowHeight / 2 + 5}" font-family="'DejaVu Sans', sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Thành Tiền</text>
        </g>

        ${rowsSvg}
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generates a supplier summary PNG matching the user-provided layout.
   */
  static async generateSupplierSummaryPng(data: SupplierSummaryData): Promise<Buffer> {
    const width = 1000;
    const rowHeight = 40;
    const headerHeight = 100; // Date + Supplier Name
    const fontSize = 14;
    const boldFontSize = 16;

    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;';
          case '"': return '&quot;'; case "'": return '&apos;'; default: return c;
        }
      });
    };

    // Grouping logic
    const groups: Record<string, typeof data.items> = {};
    data.items.forEach(item => {
      if (!groups[item.productName]) groups[item.productName] = [];
      groups[item.productName].push(item);
    });

    const totalRows = data.items.length + Object.keys(groups).length;
    const height = headerHeight + (totalRows + 2) * rowHeight + 20;

    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalMoney = data.items.reduce((sum, item) => sum + (item.total || 0), 0);

    let currentRow = 0;
    let rowsSvg = '';
    
    Object.keys(groups).forEach(productName => {
      const items = groups[productName];
      let productTotal = 0;
      
      items.forEach(item => {
        currentRow++;
        productTotal += item.quantity;
        const y = headerHeight + currentRow * rowHeight;
        rowsSvg += `
          <g transform="translate(10, ${y})">
            <rect x="0" y="0" width="180" height="${rowHeight}" fill="none" stroke="black" />
            <text x="10" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.senderName)}</text>

            <rect x="180" y="0" width="50" height="${rowHeight}" fill="none" stroke="black" />
            <text x="205" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${item.taiRank}</text>
            
            <rect x="230" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" />
            <text x="280" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${escapeXml(item.licensePlate || '-')}</text>
            
            <rect x="330" y="0" width="60" height="${rowHeight}" fill="none" stroke="black" />
            <text x="360" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${item.quantity}</text>
            
            <rect x="390" y="0" width="220" height="${rowHeight}" fill="none" stroke="black" />
            <text x="400" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.productName)}</text>
            
            <rect x="610" y="0" width="150" height="${rowHeight}" fill="none" stroke="black" />
            <text x="750" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="end">${(item.price || 0).toLocaleString('vi-VN')}</text>

            <rect x="760" y="0" width="${width - 20 - 760}" height="${rowHeight}" fill="none" stroke="black" />
            <text x="${width - 30}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="end">${(item.total || 0).toLocaleString('vi-VN')}</text>
          </g>
        `;
      });

      // Sub-total row
      currentRow++;
      const subTotalY = headerHeight + currentRow * rowHeight;
      rowsSvg += `
        <g transform="translate(10, ${subTotalY})">
          <rect x="0" y="0" width="330" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="165" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tổng</text>
          
          <rect x="330" y="0" width="60" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="360" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">${productTotal}</text>
          
          <rect x="390" y="0" width="${width - 20 - 390}" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="400" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold">${escapeXml(productName)}</text>
        </g>
      `;
    });

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
        
        <!-- Header -->
        <rect x="10" y="10" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="35" font-family="'DejaVu Sans', sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">${escapeXml(data.date)}</text>
        
        <rect x="10" y="50" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="75" font-family="'DejaVu Sans', sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">${escapeXml(data.supplierName)}</text>
        
        <!-- Table Header -->
        <g transform="translate(10, ${headerHeight})">
          <rect x="0" y="0" width="180" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="90" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Người Gửi</text>

          <rect x="180" y="0" width="50" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="205" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tài</text>
          
          <rect x="230" y="0" width="100" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="280" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Số xe</text>
          
          <rect x="330" y="0" width="60" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="360" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">SL</text>
          
          <rect x="390" y="0" width="220" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="500" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tên Hàng</text>

          <rect x="610" y="0" width="150" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="685" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Đơn giá</text>

          <rect x="760" y="0" width="${width - 20 - 760}" height="${rowHeight}" fill="#f0f0f0" stroke="black" />
          <text x="${760 + (width - 20 - 760) / 2}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Thành tiền</text>
        </g>

        ${rowsSvg}

        <!-- Grand Total Footer -->
        <g transform="translate(10, ${headerHeight + (totalRows + 1) * rowHeight})">
          <rect x="0" y="0" width="330" height="${rowHeight}" fill="#e0e0e0" stroke="black" />
          <text x="165" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">TỔNG CỘNG</text>
          
          <rect x="330" y="0" width="60" height="${rowHeight}" fill="#e0e0e0" stroke="black" />
          <text x="360" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">${totalQuantity}</text>
          
          <rect x="390" y="0" width="370" height="${rowHeight}" fill="#e0e0e0" stroke="black" />
          
          <rect x="760" y="0" width="${width - 20 - 760}" height="${rowHeight}" fill="#e0e0e0" stroke="black" />
          <text x="${width - 30}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="end">${totalMoney.toLocaleString('vi-VN')}</text>
        </g>
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generates a sender summary PNG.
   */
  static async generateSenderSummaryPng(data: SenderSummaryData): Promise<Buffer> {
    const width = 800;
    const rowHeight = 40;
    const headerHeight = 100; // Date + Sender Name
    const fontSize = 16;
    const boldFontSize = 18;

    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;';
          case '"': return '&quot;'; case "'": return '&apos;'; default: return c;
        }
      });
    };

    // Grouping logic
    const groups: Record<string, typeof data.items> = {};
    data.items.forEach(item => {
      if (!groups[item.productName]) groups[item.productName] = [];
      groups[item.productName].push(item);
    });

    const totalRows = data.items.length + Object.keys(groups).length;
    const height = headerHeight + (totalRows + 1) * rowHeight + 20;

    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

    let currentRow = 0;
    let rowsSvg = '';
    
    Object.keys(groups).forEach(productName => {
      const items = groups[productName];
      let productTotal = 0;
      
      items.forEach(item => {
        currentRow++;
        productTotal += item.quantity;
        const y = headerHeight + currentRow * rowHeight;
        rowsSvg += `
          <g transform="translate(10, ${y})">
            <rect x="0" y="0" width="60" height="${rowHeight}" fill="none" stroke="black" />
            <text x="30" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${item.taiRank}</text>
            
            <rect x="60" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" />
            <text x="110" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${escapeXml(item.licensePlate || '-')}</text>
            
            <rect x="160" y="0" width="80" height="${rowHeight}" fill="none" stroke="black" />
            <text x="200" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" text-anchor="middle">${item.quantity}</text>
            
            <rect x="240" y="0" width="280" height="${rowHeight}" fill="none" stroke="black" />
            <text x="250" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.productName)}</text>
            
            <rect x="520" y="0" width="${width - 20 - 520}" height="${rowHeight}" fill="none" stroke="black" />
            <text x="530" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}">${escapeXml(item.depotName)}</text>
          </g>
        `;
      });

      // Sub-total row
      currentRow++;
      const subTotalY = headerHeight + currentRow * rowHeight;
      rowsSvg += `
        <g transform="translate(10, ${subTotalY})">
          <rect x="0" y="0" width="160" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="80" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tổng</text>
          
          <rect x="160" y="0" width="80" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="200" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">${productTotal}</text>
          
          <rect x="240" y="0" width="${width - 20 - 240}" height="${rowHeight}" fill="#f9f9f9" stroke="black" />
          <text x="250" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold">${escapeXml(productName)}</text>
        </g>
      `;
    });

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
        
        <!-- Header -->
        <rect x="10" y="10" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="35" font-family="'DejaVu Sans', sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">${escapeXml(data.date)}</text>
        
        <rect x="10" y="50" width="${width - 20}" height="40" fill="none" stroke="black" />
        <text x="${width / 2}" y="75" font-family="'DejaVu Sans', sans-serif" font-size="${boldFontSize}" font-weight="bold" text-anchor="middle">${escapeXml(data.senderName)}</text>
        
        <!-- Table Header -->
        <g transform="translate(10, ${headerHeight})">
          <rect x="0" y="0" width="60" height="${rowHeight}" fill="none" stroke="black" />
          <text x="30" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tài</text>
          
          <rect x="60" y="0" width="100" height="${rowHeight}" fill="none" stroke="black" />
          <text x="110" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Số xe</text>
          
          <rect x="160" y="0" width="80" height="${rowHeight}" fill="none" stroke="black" />
          <text x="200" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">SL</text>
          
          <rect x="240" y="0" width="280" height="${rowHeight}" fill="none" stroke="black" />
          <text x="380" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Tên Hàng</text>
          
          <rect x="520" y="0" width="${width - 20 - 520}" height="${rowHeight}" fill="none" stroke="black" />
          <text x="${520 + (width - 20 - 520) / 2}" y="${rowHeight / 2 + 6}" font-family="'DejaVu Sans', sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle">Vựa</text>
        </g>

        ${rowsSvg}
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }
}
