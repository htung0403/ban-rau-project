import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import type { DeliveryOrder } from '../../types';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { isSoftDeletedSourceOrder } from '../../utils/softDeletedOrder';
/** Cột xe trên phiếu in (cố định, không in biển số) */
const PRINT_VEHICLE_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'] as const;

const qtyForPrintSlot = (order: DeliveryOrder, col: string) => {
  const matches = (order.delivery_vehicles || []).filter((dv) => {
    const plate = (dv.vehicles?.license_plate || '').toLowerCase().replace(/\s/g, '');
    if (col === 'ba') return plate.includes('ba');
    if (col === 'kho') return plate.includes('kho');
    return plate.includes(col);
  });
  return matches.reduce((sum, dv) => sum + (dv.assigned_quantity || 0), 0);
};

const getDisplayProductName = (order: DeliveryOrder) =>
  order.product_name.includes(' - ') ? order.product_name.split(' - ').slice(1).join(' - ') : order.product_name;

const getReceiverDisplayName = (order: DeliveryOrder) => {
  const orderObj = order.import_orders;
  return orderObj?.customers?.name || orderObj?.receiver_name?.trim() || orderObj?.profiles?.full_name || '-';
};

const PrintDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDateFrom = searchParams.get('dateFrom') || format(new Date(), 'yyyy-MM-dd');
  const initialDateTo = searchParams.get('dateTo') || format(new Date(), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<string>(initialDateFrom);
  const [endDate, setEndDate] = useState<string>(initialDateTo);

  const { data: ordersRaw, isLoading, isError, refetch } = useDeliveryOrders(startDate, endDate, 'standard');

  const orders = React.useMemo(() => {
    return (ordersRaw || []).filter((o) => !isSoftDeletedSourceOrder(o));
  }, [ordersRaw]);

  let filteredOrders = orders || [];
  filteredOrders.sort((a, b) => getReceiverDisplayName(a).localeCompare(getReceiverDisplayName(b), 'vi'));

  const groupedOrders = (filteredOrders || []).reduce<Record<string, DeliveryOrder[]>>((acc, order) => {
    const date = order.delivery_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a)); // Newest first

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        /* Tỷ lệ giống phiếu tay: Tên khách rộng ~38%, SL+Hàng ~20%, 10 ô xe ~42% (hẹp vừa số) */
        .print-area .print-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          font-family: "Times New Roman", Times, serif;
        }
        .print-area .print-table .col-name { width: 38%; }
        .print-area .print-table .col-qty { width: 5%; }
        .print-area .print-table .col-product { width: 15%; }
        .print-area .print-table .col-slot,
        .print-area .print-table .col-slot-head { width: 4.2%; }

        @media print {
          body { 
            counter-reset: page; 
          }
          
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            display: block !important; 
          }
          .no-print { display: none !important; }
          
          .print-section {
            page-break-before: always;
          }
          .print-section:first-child {
            page-break-before: auto;
          }

          @page { 
            size: A4 portrait; 
            margin: 12mm 8mm 10mm 8mm;
          }

          .page-number-auto::after {
            counter-increment: page;
            content: "Tờ: " counter(page);
            position: fixed;
            top: 2mm;
            right: 10mm;
            font-size: 14px;
            font-weight: bold;
            visibility: visible !important;
          }

          .print-area .print-table {
            font-size: 10px;
            page-break-inside: auto;
          }
          .print-area .print-table thead { display: table-header-group; }
          .print-area .print-table tr { page-break-inside: avoid; page-break-after: auto; }
          
          .print-area .print-table th, .print-area .print-table td {
            border: 1px solid #000 !important;
            padding: 3px 4px !important;
            overflow: hidden;
            word-break: break-word;
          }
          .print-area .print-table th { font-weight: bold; text-align: center; background-color: #f3f4f6 !important; }
          .print-area .print-table .col-name,
          .print-area .print-table .col-product {
            padding: 3px 5px !important;
          }
          .print-area .print-table .col-qty {
            padding: 3px 2px !important;
          }
          .print-area .print-table .col-slot,
          .print-area .print-table .col-slot-head {
            font-size: 9px !important;
            padding: 2px 1px !important;
            line-height: 1.15;
            white-space: nowrap;
          }
          .print-area .print-table .col-slot-head { font-weight: bold; }
          
          .print-header-repeat {
            border: none !important;
          }
          .print-header-repeat th {
            border: none !important;
            background: transparent !important;
            padding: 0 0 6px 0 !important;
          }
          .print-sheet-date {
            font-size: 13px !important;
            font-weight: bold;
          }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        @media screen {
          .print-sheet {
            max-width: 210mm;
            margin: 0 auto 24px auto;
            padding: 8mm 10mm;
            background: white;
            box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
          .print-area .print-table {
            font-size: 11px;
          }
          .print-area .print-table .col-slot,
          .print-area .print-table .col-slot-head {
            font-size: 10px;
            padding: 3px 2px !important;
            white-space: nowrap;
          }
          .page-number-auto::after {
            content: "Số tờ sẽ tự động hiển thị khi in";
            display: block;
            text-align: right;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }
        }
        
        .print-table { width: 100%; border-collapse: collapse; font-family: "Times New Roman", Times, serif; font-size: 14px; }
        .print-table th, .print-table td { border: 1px solid #000 !important; padding: 4px 6px !important; }
        .print-table th { font-weight: bold; text-align: center; }
      `}</style>

      <div className="no-print animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[18px] font-black text-foreground">In Phiếu Giao Hàng</h1>
            <p className="text-[12px] text-muted-foreground">Hàng tạp hóa</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-4 mb-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Thời gian giao</label>
            <DateRangePicker
              initialDateFrom={startDate}
              initialDateTo={endDate}
              onUpdate={(values) => {
                if (values.range.from) setStartDate(format(values.range.from, 'yyyy-MM-dd'));
                else setStartDate('');
                if (values.range.to) setEndDate(format(values.range.to, 'yyyy-MM-dd'));
                else setEndDate('');
              }}
            />
          </div>

          <button
            onClick={handlePrint}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            <Printer size={16} />
            In ({filteredOrders.length} dòng)
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="no-print p-4">
          <LoadingSkeleton rows={10} columns={6} />
        </div>
      ) : isError ? (
        <div className="no-print">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-print">
          <EmptyState
            title="Không có dữ liệu"
            description="Không có đơn giao hàng tạp hóa trong khoảng thời gian này"
          />
        </div>
      ) : (
        <div className="print-area page-number-auto">
          {sortedDates.map((date) => (
            <div key={date} className="print-section print-sheet">
              <table className="print-table">
                <thead>
                  <tr className="print-header-repeat">
                    <th colSpan={3} className="text-left">
                      <div className="print-sheet-date text-[16px] font-bold">Ngày giao: {new Date(date).toLocaleDateString('vi-VN')}</div>
                    </th>
                    <th colSpan={PRINT_VEHICLE_SLOTS.length} className="text-right">
                      {/* Page number handled by fixed position */}
                    </th>
                  </tr>
                  <tr>
                    <th className="col-name text-left border border-black align-middle">Tên Khách</th>
                    <th className="col-qty border border-black align-middle text-center">SL</th>
                    <th className="col-product text-left border border-black align-middle">Hàng</th>
                    {PRINT_VEHICLE_SLOTS.map((col) => (
                      <th key={col} className="col-slot-head text-center border border-black">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedOrders[date].map(o => (
                    <tr key={o.id}>
                      <td className="text-left font-medium border border-black">{getReceiverDisplayName(o)}</td>
                      <td className="text-center font-bold border border-black">{o.total_quantity || ''}</td>
                      <td className="text-left border border-black">{getDisplayProductName(o)}</td>
                      {PRINT_VEHICLE_SLOTS.map((col) => {
                        const qty = qtyForPrintSlot(o, col);
                        return (
                          <td
                            key={col}
                            className="col-slot text-center font-bold border border-black tabular-nums"
                            style={{ color: '#dc2626' }}
                          >
                            {qty > 0 ? qty : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PrintDeliveryPage;
