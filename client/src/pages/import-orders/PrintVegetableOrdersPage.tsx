import React, { useMemo, useState, useRef } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { DatePicker } from '../../components/shared/DatePicker';
import { CreatableSearchableSelect } from '../../components/ui/CreatableSearchableSelect';
import { useImportOrders } from '../../hooks/queries/useImportOrders';
import { useVehicles } from '../../hooks/queries/useVehicles';
import type { ImportOrderFilters } from '../../types';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────
const formatNumber = (value?: number | null) => {
  if (value == null) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
};

const getSupplierName = (order: any) =>
  order.customers?.name || order.sender_name || '';

const getTaiRank = (order: any, rankMap: Map<string, number>) =>
  rankMap.get(order.id) || 1;

// ─── Constants ────────────────────────────────────────────
const ROWS_PER_A4 = 38; // ~38 data rows fit on one A4 page
const MAX_AMOUNT_PER_SHEET = 5_000_000; // 5 triệu

type PrintMode = 'a4' | 'amount';

// ─── Types ────────────────────────────────────────────────
interface FlatItem {
  supplierName: string;
  taiRank: number;
  quantity: number;
  productName: string;
  priceK: number;
  totalAmount: number;
  orderId: string;
}

// ─── Component ────────────────────────────────────────────
const PrintVegetableOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // Controls
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [soXe, setSoXe] = useState('');
  const [printMode, setPrintMode] = useState<PrintMode>('a4');

  // Fetch data
  const filters: ImportOrderFilters = {
    dateFrom: selectedDate,
    dateTo: selectedDate,
    order_category: 'vegetable',
  };

  const { data: orders, isLoading, isError, refetch } = useImportOrders(filters);

  // Fetch vehicles for Số Xe selector
  const { data: vehicles } = useVehicles();
  const vehicleOptions = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.map((v: any) => ({
      value: v.license_plate || v.name || v.id,
      label: v.license_plate || v.name || v.id,
    }));
  }, [vehicles]);

  // ─── Compute taiRank per order ────────────────────────
  const taiRankByOrderId = useMemo(() => {
    const rankMap = new Map<string, number>();
    if (!orders) return rankMap;

    const ordersBySupplierDate = new Map<string, any[]>();
    orders.forEach((order) => {
      if ((order as any).deleted_at) return;
      const supplierName = getSupplierName(order);
      const orderDate = order.order_date || '';
      const key = `${supplierName}||${orderDate}`;
      const current = ordersBySupplierDate.get(key) || [];
      current.push(order);
      ordersBySupplierDate.set(key, current);
    });

    ordersBySupplierDate.forEach((supplierOrders) => {
      const sorted = [...supplierOrders].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      sorted.forEach((order, index) => {
        rankMap.set(order.id, index + 1);
      });
    });

    return rankMap;
  }, [orders]);

  // ─── Flatten & sort ABC ───────────────────────────────
  const flatItems: FlatItem[] = useMemo(() => {
    if (!orders) return [];

    const items: FlatItem[] = [];
    orders.forEach((order) => {
      if ((order as any).deleted_at) return;
      const supplierName = getSupplierName(order);
      const taiRank = getTaiRank(order, taiRankByOrderId);

      if (order.import_order_items && order.import_order_items.length > 0) {
        order.import_order_items.forEach((item) => {
          const priceK = item.products?.base_price
            ? item.products.base_price / 1000
            : 0;
          const totalAmount =
            typeof item.quantity === 'number' && item.products?.base_price
              ? item.quantity * item.products.base_price
              : 0;

          items.push({
            supplierName,
            taiRank,
            quantity: item.quantity || 0,
            productName: item.products?.name || item.package_type || '',
            priceK,
            totalAmount,
            orderId: order.id,
          });
        });
      } else {
        // Order without items — use order-level total
        items.push({
          supplierName,
          taiRank,
          quantity: 0,
          productName: '',
          priceK: 0,
          totalAmount: Number(order.total_amount) || 0,
          orderId: order.id,
        });
      }
    });

    // Sort ABC by supplierName, then taiRank
    items.sort((a, b) => {
      const cmp = a.supplierName.localeCompare(b.supplierName, 'vi');
      if (cmp !== 0) return cmp;
      if (a.taiRank !== b.taiRank) return a.taiRank - b.taiRank;
      return a.productName.localeCompare(b.productName, 'vi');
    });

    return items;
  }, [orders, taiRankByOrderId]);

  // ─── Split into sheets ────────────────────────────────
  const sheets: FlatItem[][] = useMemo(() => {
    if (flatItems.length === 0) return [];

    if (printMode === 'a4') {
      // Mode 1: split by row count
      const result: FlatItem[][] = [];
      for (let i = 0; i < flatItems.length; i += ROWS_PER_A4) {
        result.push(flatItems.slice(i, i + ROWS_PER_A4));
      }
      return result;
    } else {
      // Mode 2: split by total amount <= 5 million
      const result: FlatItem[][] = [];
      let current: FlatItem[] = [];
      let currentTotal = 0;

      flatItems.forEach((item) => {
        if (current.length > 0 && currentTotal + item.totalAmount > MAX_AMOUNT_PER_SHEET) {
          result.push(current);
          current = [];
          currentTotal = 0;
        }
        current.push(item);
        currentTotal += item.totalAmount;
      });

      if (current.length > 0) {
        result.push(current);
      }

      return result;
    }
  }, [flatItems, printMode]);

  // ─── Parse date for display ───────────────────────────
  const dateParts = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
  }, [selectedDate]);

  // ─── Print handler ────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* ═══ Print Styles ═══ */}
      <style>{`
        @media print {
          /* Hide everything except print area */
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          
          /* Each sheet = one page */
          .print-sheet {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-sheet:last-child {
            page-break-after: auto;
          }

          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          .print-table {
            font-size: 11px !important;
          }
          .print-table th,
          .print-table td {
            padding: 2px 6px !important;
          }
        }

        @media screen {
          .print-sheet {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto 24px auto;
            padding: 10mm 12mm;
            background: white;
            box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
        }
      `}</style>

      {/* ═══ Control Bar (not printed) ═══ */}
      <div className="no-print animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[18px] font-black text-foreground">In Phiếu Hàng Rau</h1>
            <p className="text-[12px] text-muted-foreground">Nhà Xe Năm Sự</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4">
          {/* Date picker */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Ngày</label>
            <DatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              placeholder="Chọn ngày..."
              className="w-[170px]"
            />
          </div>

          {/* Số Xe */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Số Xe</label>
            <CreatableSearchableSelect
              options={vehicleOptions}
              value={soXe}
              onValueChange={(val) => setSoXe(val)}
              onCreate={(val) => setSoXe(val)}
              placeholder="Chọn hoặc nhập số xe..."
              searchPlaceholder="Tìm xe hoặc nhập mới..."
              createMessage="Dùng số xe"
              className="w-[200px]"
            />
          </div>

          {/* Print Mode */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Kiểu in</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setPrintMode('a4')}
                className={`px-4 py-2 text-[12px] font-bold transition-colors ${
                  printMode === 'a4'
                    ? 'bg-primary text-white'
                    : 'bg-muted/10 text-muted-foreground hover:bg-muted/30'
                }`}
              >
                Kiểu 1: Đủ tờ A4
              </button>
              <button
                onClick={() => setPrintMode('amount')}
                className={`px-4 py-2 text-[12px] font-bold transition-colors border-l border-border ${
                  printMode === 'amount'
                    ? 'bg-primary text-white'
                    : 'bg-muted/10 text-muted-foreground hover:bg-muted/30'
                }`}
              >
                Kiểu 2: Dưới 5 triệu/tờ
              </button>
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            disabled={sheets.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            <Printer size={16} />
            In ({sheets.length} tờ)
          </button>
        </div>

        {/* Stats */}
        {flatItems.length > 0 && (
          <div className="flex items-center gap-4 mb-4 px-1">
            <span className="text-[12px] text-muted-foreground">
              Tổng: <strong className="text-foreground">{flatItems.length}</strong> dòng
            </span>
            <span className="text-[12px] text-muted-foreground">
              Tổng tiền: <strong className="text-primary font-black">{formatNumber(flatItems.reduce((s, i) => s + i.totalAmount, 0))}</strong>
            </span>
            <span className="text-[12px] text-muted-foreground">
              Số tờ: <strong className="text-foreground">{sheets.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ═══ Content ═══ */}
      {isLoading ? (
        <div className="no-print p-4">
          <LoadingSkeleton rows={10} columns={6} />
        </div>
      ) : isError ? (
        <div className="no-print">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : flatItems.length === 0 ? (
        <div className="no-print">
          <EmptyState
            title="Không có dữ liệu"
            description={`Không có đơn hàng rau nào vào ngày ${dateParts.day}/${dateParts.month}/${dateParts.year}`}
          />
        </div>
      ) : (
        <div className="print-area" ref={printRef}>
          {sheets.map((sheetItems, sheetIndex) => {
            const sheetTotal = sheetItems.reduce((s, i) => s + i.totalAmount, 0);
            return (
              <div key={sheetIndex} className="print-sheet">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, fontFamily: 'serif' }}>
                    Nhà Xe Năm Sự
                  </h2>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>Tờ </span>
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 30, textAlign: 'center', fontWeight: 700 }}>
                      {sheetIndex + 1}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>Số Xe: </span>
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: 60, textAlign: 'center' }}>
                      {soXe}
                    </span>
                  </div>
                  <div style={{ fontStyle: 'italic' }}>
                    Ngày {dateParts.day} Tháng {dateParts.month} Năm {dateParts.year}
                  </div>
                </div>

                {/* Table */}
                <table
                  className="print-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    fontFamily: "'Times New Roman', serif",
                    border: '2px solid #000',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700, border: '1px solid #000' }}>Tên Vựa</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, width: 40, border: '1px solid #000' }}>Tải</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, width: 45, border: '1px solid #000' }}>SL</th>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700, border: '1px solid #000' }}>Tên Hàng</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 700, width: 60, border: '1px solid #000' }}>Tiền(K)</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, width: 100, border: '1px solid #000' }}>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '3px 6px', fontWeight: 500, borderLeft: '1px solid #000', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>{item.supplierName}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>{item.taiRank}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>{item.quantity || ''}</td>
                        <td style={{ padding: '3px 6px', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>{item.productName}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>{item.priceK > 0 ? item.priceK : ''}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                          {item.totalAmount > 0 ? formatNumber(item.totalAmount) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #000' }}>
                      <td colSpan={5} style={{ padding: '5px 6px', fontWeight: 900, textAlign: 'right', fontSize: 13, borderLeft: '1px solid #000', borderRight: '1px solid #000', borderBottom: '2px solid #000' }}>
                        Tổng
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 900, fontSize: 14, borderRight: '1px solid #000', borderBottom: '2px solid #000' }}>
                        {formatNumber(sheetTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default PrintVegetableOrdersPage;
