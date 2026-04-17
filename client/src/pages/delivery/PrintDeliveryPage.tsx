import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import { useDeliveryOrders } from '../../hooks/queries/useDelivery';
import { useVehicles } from '../../hooks/queries/useVehicles';
import type { DeliveryOrder, Vehicle } from '../../types';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { isSoftDeletedSourceOrder } from '../../utils/softDeletedOrder';

const getDisplayProductName = (order: DeliveryOrder) =>
  order.product_name.includes(' - ') ? order.product_name.split(' - ').slice(1).join(' - ') : order.product_name;

const getReceiverDisplayName = (order: DeliveryOrder) => {
  const orderObj = order.import_orders;
  return orderObj?.customers?.name || orderObj?.receiver_name?.trim() || orderObj?.profiles?.full_name || '-';
};

const vehicleSupportsGoodsCategory = (vehicle: Vehicle, category: 'grocery' | 'vegetable') => {
  if (!vehicle.goods_categories || vehicle.goods_categories.length === 0) return true;
  return vehicle.goods_categories.includes(category);
};

const PrintDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDateFrom = searchParams.get('dateFrom') || format(new Date(), 'yyyy-MM-dd');
  const initialDateTo = searchParams.get('dateTo') || format(new Date(), 'yyyy-MM-dd');
  
  const [startDate, setStartDate] = useState<string>(initialDateFrom);
  const [endDate, setEndDate] = useState<string>(initialDateTo);

  const { data: ordersRaw, isLoading, isError, refetch } = useDeliveryOrders(startDate, endDate, 'standard');
  const { data: vehicles } = useVehicles();

  const orders = React.useMemo(() => {
    return (ordersRaw || []).filter((o) => !isSoftDeletedSourceOrder(o));
  }, [ordersRaw]);

  const eligibleVehicles = React.useMemo(
    () => (vehicles || []).filter((vehicle) => vehicleSupportsGoodsCategory(vehicle, 'grocery')),
    [vehicles]
  );

  let filteredOrders = orders || [];
  filteredOrders.sort((a, b) => getReceiverDisplayName(a).localeCompare(getReceiverDisplayName(b), 'vi'));

  const groupedOrders = (filteredOrders || []).reduce<Record<string, DeliveryOrder[]>>((acc, order) => {
    const date = order.delivery_date || 'N/A';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a)); // Newest first

  const ROWS_PER_A4 = 28;
  const printPages: { date: string; orders: DeliveryOrder[]; pageNumber: number }[] = [];
  
  sortedDates.forEach((date) => {
    const ordersForDate = groupedOrders[date];
    for (let i = 0; i < ordersForDate.length; i += ROWS_PER_A4) {
      printPages.push({
        date,
        orders: ordersForDate.slice(i, i + ROWS_PER_A4),
        pageNumber: Math.floor(i / ROWS_PER_A4) + 1,
      });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .no-print { display: none !important; }
          
          .print-sheet {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-sheet:last-child {
            page-break-after: auto;
          }

          @page { size: A4 portrait; margin: 10mm; }

          .print-table { width: 100%; border-collapse: collapse; font-family: "Times New Roman", serif; font-size: 14px; }
          .print-table th, .print-table td { border: 1px solid #000 !important; padding: 4px 6px !important; }
          .print-table th { font-weight: bold; text-align: center; }
          
          /* Force colors to print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
        
        /* Apply table borders to screen too */
        .print-table { width: 100%; border-collapse: collapse; font-family: "Times New Roman", serif; font-size: 14px; }
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
        <div className="print-area">
          {printPages.map((page) => (
            <div key={`${page.date}-${page.pageNumber}`} className="print-sheet mb-8">
              <div className="flex justify-between items-end mb-4 px-2">
                <div className="text-[16px] font-bold">Ngày giao: {new Date(page.date).toLocaleDateString('vi-VN')}</div>
                <div className="text-[16px] font-bold">Tờ: {page.pageNumber}</div>
              </div>
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="text-left w-[180px] border border-black align-middle">Tên Khách</th>
                    <th className="w-[50px] border border-black align-middle text-center">SL</th>
                    <th className="text-left w-[150px] border border-black align-middle">Hàng</th>
                    {eligibleVehicles.map(v => (
                      <th key={v.id} className="w-[45px] text-center border border-black text-[11px] break-words uppercase">
                        {v.license_plate}
                      </th>
                    ))}
                    {eligibleVehicles.length === 0 && ['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => (
                      <th key={col} className="w-[45px] text-center border border-black uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.orders.map(o => (
                    <tr key={o.id}>
                      <td className="text-left font-medium border border-black">{getReceiverDisplayName(o)}</td>
                      <td className="text-center font-bold border border-black">{o.total_quantity || ''}</td>
                      <td className="text-left border border-black">{getDisplayProductName(o)}</td>
                      {eligibleVehicles.map(v => {
                        const dv = (o.delivery_vehicles || []).find(deliveryVehicle => deliveryVehicle.vehicle_id === v.id);
                        const qty = dv?.assigned_quantity || 0;
                        return (
                          <td key={v.id} className="text-center font-bold border border-black" style={{ color: '#dc2626' }}>
                            {qty > 0 ? qty : ''}
                          </td>
                        );
                      })}
                      {eligibleVehicles.length === 0 && ['1', '2', '3', '4', '5', '6', '7', '8', 'ba', 'kho'].map(col => {
                        const matches = (o.delivery_vehicles || []).filter(dv => {
                          const plate = (dv.vehicles?.license_plate || '').toLowerCase();
                          if (col === 'ba') return plate.includes('ba');
                          if (col === 'kho') return plate.includes('kho');
                          return plate.includes(col);
                        });
                        const qty = matches.reduce((sum, dv) => sum + (dv.assigned_quantity || 0), 0);
                        return (
                          <td key={col} className="text-center font-bold border border-black" style={{ color: '#dc2626' }}>
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
