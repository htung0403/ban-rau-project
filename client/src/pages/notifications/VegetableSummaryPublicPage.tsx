import React, { useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Printer, FileText } from 'lucide-react';
import { VEGETABLE_PRINT_TABLE_STYLE } from '../import-orders/PrintVegetableOrdersPage';
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatNumber = (value?: number | null) => {
  if (value == null) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
};

type VegetableSummaryType = 'supplier' | 'sender';

interface SupplierSummaryItem {
  taiRank: number;
  licensePlate: string;
  quantity: number;
  productName: string;
  senderName: string;
  price?: number;
  total?: number;
}

interface SenderSummaryItem {
  taiRank: number;
  licensePlate: string;
  quantity: number;
  productName: string;
  supplierName: string;
}

interface SupplierSummaryData {
  supplierName: string;
  date: string;
  items: SupplierSummaryItem[];
}

interface SenderSummaryData {
  senderName: string;
  date: string;
  items: SenderSummaryItem[];
}

type VegetableSummaryData = SupplierSummaryData | SenderSummaryData;

const isSupplierSummaryData = (value: VegetableSummaryData): value is SupplierSummaryData => {
  return 'supplierName' in value;
};

const VegetableSummaryPublicPage: React.FC = () => {
  const { type, id, date, token } = useParams<{ type: VegetableSummaryType; id: string; date: string; token: string }>();

  const isSupplierView = type === 'supplier';
  const isSenderView = type === 'sender';
  const isValidType = isSupplierView || isSenderView;
  const hasRequiredParams = Boolean(type && id && date && token);

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery<VegetableSummaryData>({
    queryKey: ['public-vegetable-summary', type, id, date, token],
    enabled: hasRequiredParams && isValidType,
    retry: false,
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/public/summary/${type}/${id}/${date}/${token}`);
      const responseData = response.data?.data || response.data;
      if (!responseData) {
        throw new Error('Không tìm thấy dữ liệu tổng kết');
      }
      return responseData as VegetableSummaryData;
    },
  });

  const errorMessage = useMemo(() => {
    if (!hasRequiredParams) return 'Liên kết không hợp lệ hoặc đã hết hạn.';
    if (!isValidType) return 'Loại tổng kết không hợp lệ';
    if (!queryError) return null;

    if (axios.isAxiosError(queryError)) {
      return queryError.response?.data?.message || 'Không tìm thấy dữ liệu tổng kết';
    }
    if (queryError instanceof Error) {
      return queryError.message;
    }
    return 'Không tìm thấy dữ liệu tổng kết';
  }, [hasRequiredParams, isValidType, queryError]);

  const totalQuantity = useMemo(() => {
    if (!data) return 0;
    return data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [data]);

  const totalAmount = useMemo(() => {
    if (!data || !isSupplierSummaryData(data)) return 0;
    return data.items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [data, isSupplierView]);

  const title = isSupplierView ? 'Phiếu Tổng Kết Hàng Đã Nhận' : 'Phiếu Tổng Kết Hàng Đã Gửi';
  const ownerName = data ? (isSupplierSummaryData(data) ? data.supplierName : data.senderName) : '';

  if (isLoading) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.spinner} />
        <p style={styles.messageText}>Đang tải dữ liệu tổng kết...</p>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div style={styles.centerScreen}>
        <FileText size={64} color="#94a3b8" />
        <h2 style={{ margin: '12px 0 8px', fontSize: 20 }}>Lỗi truy cập</h2>
        <p style={styles.messageText}>{errorMessage || 'Liên kết không hợp lệ hoặc đã hết hạn.'}</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .public-print-area, .public-print-area * { visibility: visible !important; }
          .public-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 8mm 10mm; }
        }

        @media screen {
          .public-print-sheet {
            max-width: 210mm;
            min-height: 297mm;
            margin: 16px auto 24px auto;
            padding: 10mm 12mm;
            background: white;
            box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
        }
      `}</style>

      <div className="no-print" style={styles.toolbar}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{title}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Nhà Xe Năm Sự</p>
        </div>
        <button onClick={() => window.print()} style={styles.printButton}>
          <Printer size={18} />
          <span>In phiếu</span>
        </button>
      </div>

      <div className="public-print-area">
        <div className="public-print-sheet">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, fontFamily: 'serif' }}>Nhà Xe Năm Sự</h2>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700 }}>{title}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
            <div>
              <span style={{ fontWeight: 700 }}>{isSupplierView ? 'Tên Vựa: ' : 'Người Gửi: '}</span>
              <span>{ownerName}</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>Ngày: </span>
              <span>{data.date}</span>
            </div>
          </div>

          <table className="print-table" style={VEGETABLE_PRINT_TABLE_STYLE}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={styles.headerCell}>{isSupplierView ? 'Người Gửi' : 'Tên Vựa'}</th>
                <th style={styles.headerCellCenter}>Tài</th>
                <th style={styles.headerCellCenter}>Số Xe</th>
                <th style={styles.headerCellCenter}>SL</th>
                <th style={styles.headerCell}>Tên Hàng</th>
                {isSupplierView && <th style={styles.headerCellCenter}>Tiền(K)</th>}
                {isSupplierView && <th style={styles.headerCellRight}>Thành Tiền</th>}
              </tr>
            </thead>
            <tbody>
              {isSupplierView &&
                isSupplierSummaryData(data) &&
                data.items.map((item, index) => (
                  <tr key={`${item.productName}-${index}`}>
                    <td style={styles.bodyCell}>{item.senderName || '-'}</td>
                    <td style={styles.bodyCellCenter}>{item.taiRank || ''}</td>
                    <td style={styles.bodyCellCenter}>{item.licensePlate || '-'}</td>
                    <td style={styles.bodyCellCenter}>{item.quantity || ''}</td>
                    <td style={styles.bodyCell}>{item.productName || ''}</td>
                    <td style={styles.bodyCellCenter}>{item.price ? formatNumber((item.price || 0) / 1000) : ''}</td>
                    <td style={styles.bodyCellRight}>{item.total ? formatNumber(item.total) : ''}</td>
                  </tr>
                ))}

              {isSenderView &&
                !isSupplierSummaryData(data) &&
                data.items.map((item, index) => (
                  <tr key={`${item.productName}-${index}`}>
                    <td style={styles.bodyCell}>{item.supplierName || '-'}</td>
                    <td style={styles.bodyCellCenter}>{item.taiRank || ''}</td>
                    <td style={styles.bodyCellCenter}>{item.licensePlate || '-'}</td>
                    <td style={styles.bodyCellCenter}>{item.quantity || ''}</td>
                    <td style={styles.bodyCell}>{item.productName || ''}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isSupplierView ? 3 : 3} style={styles.footerLabelCell}>
                  Tổng Số Lượng
                </td>
                <td style={styles.footerValueCellCenter}>{formatNumber(totalQuantity)}</td>
                <td style={styles.footerBlankCell} />
                {isSupplierView && <td style={styles.footerBlankCell} />}
                {isSupplierView && <td style={styles.footerValueCellRight}>{formatNumber(totalAmount)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  centerScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#f8fafc',
    textAlign: 'center',
    padding: 20,
  },
  messageText: {
    color: '#64748b',
    fontSize: 14,
    margin: 0,
  },
  spinner: {
    width: 34,
    height: 34,
    border: '3px solid #e2e8f0',
    borderTopColor: '#0284c7',
    borderRadius: '50%',
    animation: 'spin-public-summary 0.8s linear infinite',
  },
  toolbar: {
    maxWidth: 900,
    margin: '14px auto 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '0 12px',
  },
  printButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #d1d5db',
    borderRadius: 10,
    padding: '8px 12px',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  headerCell: {
    padding: '4px 6px',
    textAlign: 'left',
    fontWeight: 700,
    border: '1px solid #000',
    fontSize: 14,
  },
  headerCellCenter: {
    padding: '4px 6px',
    textAlign: 'center',
    fontWeight: 700,
    border: '1px solid #000',
    fontSize: 14,
  },
  headerCellRight: {
    padding: '4px 6px',
    textAlign: 'right',
    fontWeight: 700,
    border: '1px solid #000',
    fontSize: 14,
  },
  bodyCell: {
    padding: '4px 6px',
    fontSize: 14,
    border: '1px solid #000',
  },
  bodyCellCenter: {
    padding: '4px 6px',
    textAlign: 'center',
    fontSize: 14,
    border: '1px solid #000',
  },
  bodyCellRight: {
    padding: '4px 6px',
    textAlign: 'right',
    fontSize: 14,
    border: '1px solid #000',
  },
  footerLabelCell: {
    padding: '6px',
    textAlign: 'right',
    fontWeight: 800,
    fontSize: 14,
    border: '1px solid #000',
  },
  footerValueCellCenter: {
    padding: '6px',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: 14,
    border: '1px solid #000',
  },
  footerValueCellRight: {
    padding: '6px',
    textAlign: 'right',
    fontWeight: 800,
    fontSize: 14,
    border: '1px solid #000',
  },
  footerBlankCell: {
    border: '1px solid #000',
  },
};

if (typeof document !== 'undefined' && !document.getElementById('public-veg-summary-style')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'public-veg-summary-style';
  styleEl.textContent = `@keyframes spin-public-summary { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleEl);
}

export default VegetableSummaryPublicPage;
