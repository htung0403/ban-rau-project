import React, { useMemo, useState, useRef } from 'react';
import { Printer, ArrowLeft, CalendarDays } from 'lucide-react';
import { DateRangePicker } from '../../components/shared/DateRangePicker';
import { CustomSelect } from '../../components/shared/CustomSelect';
import { useExpenses } from '../../hooks/queries/useHR';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Filter } from 'lucide-react';

const VN_TZ = 'Asia/Ho_Chi_Minh';

const formatNumber = (value?: number | null) => {
  if (value == null) return '';
  return new Intl.NumberFormat('vi-VN').format(value);
};

const vnDayBoundsMs = (yyyyMmDd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const start = Date.parse(`${yyyyMmDd}T00:00:00+07:00`);
  const end = Date.parse(`${yyyyMmDd}T23:59:59.999+07:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
};

const expenseInstantMs = (raw: string) => {
  if (!raw) return null;
  const ms = Date.parse(raw.length === 10 ? `${raw}T00:00:00+07:00` : raw);
  return Number.isNaN(ms) ? null : ms;
};

const formatExpenseDateDisplay = (raw: string): string => {
  if (!raw) return '—';
  const ms = Date.parse(raw.length === 10 ? `${raw}T00:00:00+07:00` : raw);
  if (Number.isNaN(ms)) return raw;
  const d = new Date(ms);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, month: '2-digit' }).format(d);
  const year = new Intl.DateTimeFormat('en-GB', { timeZone: VN_TZ, year: 'numeric' }).format(d);
  const tp = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = (tp.find((x) => x.type === 'hour')?.value ?? '00').padStart(2, '0');
  const min = (tp.find((x) => x.type === 'minute')?.value ?? '00').padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${min}`;
};

const formatOnlyDate = (yyyyMmDd: string) => {
  if (!yyyyMmDd) return '';
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
};

const PrintExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterType, setFilterType] = useState('all');

  const { data: allExpenses, isLoading, isError, refetch } = useExpenses();

  const confirmedExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return allExpenses.filter((e) => e.payment_status === 'confirmed');
  }, [allExpenses]);

  const expenseTypes = useMemo(() => {
    const types = new Set<string>();
    confirmedExpenses.forEach((e) => {
      if (e.expense_name) types.add(e.expense_name);
    });
    return Array.from(types).sort();
  }, [confirmedExpenses]);

  const filterOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Tất cả loại chi phí' },
      ...expenseTypes.map((t) => ({ value: t, label: t })),
    ];
  }, [expenseTypes]);

  const filteredExpenses = useMemo(() => {
    let result = confirmedExpenses.filter((e) => {
      const fromBounds = vnDayBoundsMs(dateFrom);
      const toBounds = vnDayBoundsMs(dateTo);
      const ms = expenseInstantMs(e.expense_date);
      if (!fromBounds || !toBounds || !ms) return false;
      return ms >= fromBounds.start && ms <= toBounds.end;
    });

    if (filterType !== 'all') {
      result = result.filter((e) => e.expense_name === filterType);
    }

    return result.sort((a, b) => {
      const msA = expenseInstantMs(a.expense_date) || 0;
      const msB = expenseInstantMs(b.expense_date) || 0;
      return msA - msB;
    });
  }, [confirmedExpenses, dateFrom, dateTo, filterType]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          
          .print-sheet {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-sheet:last-child {
            page-break-after: auto;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }

          .print-table {
            font-size: 13px !important;
          }
          .print-table th,
          .print-table td {
            padding: 6px 8px !important;
          }
        }

        @media screen {
          .print-sheet {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto 24px auto;
            padding: 15mm 15mm;
            background: white;
            box-shadow: 0 2px 16px rgba(0,0,0,0.08);
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
        }
      `}</style>

      <div className="no-print animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[18px] font-black text-foreground">In Chi Phí</h1>
              <p className="text-[12px] text-muted-foreground">Lịch sử chi phí đã xác nhận</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-card rounded-2xl border border-border shadow-sm px-4 py-2">
            <div className="flex items-center gap-3">
              <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">Khoảng ngày</label>
              <DateRangePicker
                initialDateFrom={dateFrom}
                initialDateTo={dateTo}
                onUpdate={(values) => {
                  if (values.range.from) setDateFrom(format(values.range.from, 'yyyy-MM-dd'));
                  if (values.range.to) setDateTo(format(values.range.to, 'yyyy-MM-dd'));
                  else if (values.range.from) setDateTo(format(values.range.from, 'yyyy-MM-dd'));
                }}
                icon={<CalendarDays size={14} />}
                className="w-full md:w-[260px] h-9"
              />
            </div>
            
            <div className="w-[1px] h-8 bg-border"></div>

            <div className="flex items-center gap-3">
              <label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Loại chi phí</label>
              <CustomSelect
                value={filterType}
                onChange={setFilterType}
                options={filterOptions}
                placeholder="Loại chi phí..."
                className="w-full sm:w-[200px] h-9"
                align="start"
              />
            </div>

            <div className="w-[1px] h-8 bg-border"></div>

            <button
              onClick={handlePrint}
              disabled={filteredExpenses.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              In danh sách
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="no-print p-4 bg-card rounded-2xl border border-border shadow-sm">
          <LoadingSkeleton rows={10} columns={5} />
        </div>
      ) : isError ? (
        <div className="no-print">
          <ErrorState onRetry={() => refetch()} />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="no-print">
          <EmptyState
            title="Không có dữ liệu"
            description={`Không có chi phí nào${filterType !== 'all' ? ` thuộc loại "${filterType}"` : ''} được xác nhận trong khoảng ${formatOnlyDate(dateFrom)} - ${formatOnlyDate(dateTo)}`}
          />
        </div>
      ) : (
        <div className="print-area" ref={printRef}>
          <div className="print-sheet">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8, fontFamily: 'serif' }}>
                BẢNG KÊ CHI PHÍ {filterType !== 'all' && `- ${filterType.toUpperCase()}`}
              </h2>
              <p style={{ fontStyle: 'italic', fontSize: 14 }}>
                {dateFrom === dateTo 
                  ? `Ngày ${formatOnlyDate(dateFrom)}`
                  : `Từ ngày ${formatOnlyDate(dateFrom)} đến ngày ${formatOnlyDate(dateTo)}`
                }
              </p>
            </div>

            <table
              className="print-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: "'Times New Roman', serif",
                border: '1px solid #000',
              }}
            >
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', textAlign: 'center', width: 40 }}>STT</th>
                  <th style={{ border: '1px solid #000', textAlign: 'center', width: 90 }}>Ngày chi</th>
                  <th style={{ border: '1px solid #000', textAlign: 'center', width: 90 }}>Số xe</th>
                  <th style={{ border: '1px solid #000', textAlign: 'left', width: 140 }}>Nhân viên</th>
                  <th style={{ border: '1px solid #000', textAlign: 'left' }}>Tên chi phí</th>
                  <th style={{ border: '1px solid #000', textAlign: 'right', width: 110 }}>Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, idx) => (
                  <tr key={e.id}>
                    <td style={{ border: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', textAlign: 'center' }}>
                      {formatExpenseDateDisplay(e.expense_date).split(' ')[0]}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center' }}>{e.vehicle?.license_plate || ''}</td>
                    <td style={{ border: '1px solid #000' }}>{e.employee?.full_name || ''}</td>
                    <td style={{ border: '1px solid #000' }}>{e.expense_name}</td>
                    <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatNumber(Number(e.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 'bold', padding: '8px' }}>
                    TỔNG CỘNG:
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 'bold', fontSize: 15, color: '#000' }}>
                    {formatNumber(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PrintExpensesPage;
