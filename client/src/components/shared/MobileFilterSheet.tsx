import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { DateRangePicker } from './DateRangePicker';
import { CustomSelect } from './CustomSelect';
interface MobileFilterSheetProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onApply: (filters: { dateFrom: string; dateTo: string; status: any }) => void;
  initialDateFrom: string;
  initialDateTo: string;
  initialStatus?: any;
  statusOptions?: { value: string; label: string }[];
  dateLabel?: string;
  statusLabel?: string;
}

const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  isClosing,
  onClose,
  onApply,
  initialDateFrom,
  initialDateTo,
  initialStatus = '',
  statusOptions,
  dateLabel = 'Ngày nhập',
  statusLabel = 'Trạng thái',
}) => {
  const [draftDateFrom, setDraftDateFrom] = useState(initialDateFrom);
  const [draftDateTo, setDraftDateTo] = useState(initialDateTo);
  const [draftStatus, setDraftStatus] = useState<any>(initialStatus);

  useEffect(() => {
    if (isOpen) {
      setDraftDateFrom(initialDateFrom);
      setDraftDateTo(initialDateTo);
      setDraftStatus(initialStatus);
    }
  }, [isOpen, initialDateFrom, initialDateTo, initialStatus]);

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div 
        className={clsx(
          "absolute inset-0 bg-black/40 duration-300",
          isClosing ? "animate-out fade-out" : "animate-in fade-in"
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={clsx(
        "relative bg-white rounded-t-3xl w-full px-5 pt-5 pb-6 flex flex-col gap-4 duration-300 shadow-2xl",
        isClosing ? "animate-out slide-out-to-bottom-full" : "animate-in slide-in-from-bottom-full"
      )}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[16px] font-bold text-foreground">Lọc danh sách</h3>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 bg-muted/50 text-muted-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 z-20">
            <label className="text-[13px] font-bold text-muted-foreground">{dateLabel}</label>
            <div className="relative w-full z-20">
              <DateRangePicker
                initialDateFrom={draftDateFrom || undefined}
                initialDateTo={draftDateTo || undefined}
                onUpdate={({ range }) => {
                  const format = (d: Date) => {
                    const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
                    return local.toISOString().split('T')[0];
                  };
                  setDraftDateFrom(range.from ? format(range.from) : '');
                  setDraftDateTo(range.to ? format(range.to) : '');
                }}
                align="center"
              />
            </div>
          </div>

          {statusOptions && (
            <div className="space-y-1.5 z-10">
              <label className="text-[13px] font-bold text-muted-foreground">{statusLabel}</label>
              <CustomSelect
                value={draftStatus}
                onChange={(val) => setDraftStatus(val)}
                options={statusOptions}
                className="w-full py-2.5 bg-muted/20"
              />
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-2">
          {(draftDateFrom || draftDateTo || draftStatus) && (
            <button
              onClick={() => { setDraftDateFrom(''); setDraftDateTo(''); setDraftStatus(''); }}
              className="px-4 py-3 rounded-xl border border-border/80 text-foreground text-[14px] font-bold hover:bg-muted transition-all"
            >
              Xóa lọc
            </button>
          )}
          <button
            onClick={() => {
              onApply({ dateFrom: draftDateFrom, dateTo: draftDateTo, status: draftStatus });
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-[14px] font-bold hover:bg-primary/90 transition-all"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileFilterSheet;
