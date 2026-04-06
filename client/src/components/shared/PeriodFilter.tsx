import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface PeriodFilterProps {
  label?: string;
  onUpdate: (values: { range: DateRange }) => void;
  className?: string;
  inline?: boolean;
}

const PRESETS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'thisWeek', label: 'Tuần này' },
  { id: 'lastWeek', label: 'Tuần trước' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'lastMonth', label: 'Tháng trước' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ id: `m${i + 1}`, label: `Tháng ${i + 1}` }));
const QUARTERS = Array.from({ length: 4 }, (_, i) => ({ id: `q${i + 1}`, label: `Quý ${i + 1}` }));
const YEARS = [
  { id: 'thisYear', label: 'Năm nay' },
  { id: 'lastYear', label: 'Năm ngoái' },
  { id: 'customYear', label: 'Tùy chọn năm...' },
];

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ onUpdate, className, inline }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('thisMonth');
  const [customYearStr, setCustomYearStr] = useState<string>(new Date().getFullYear().toString());

  const getRangeFromId = (id: string, customYearValue?: string): DateRange => {
    const today = new Date();
    const from = new Date();
    const to = new Date();
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    if (id === 'today') {
      return { from, to };
    }
    if (id === 'yesterday') {
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
      return { from, to };
    }
    if (id === 'thisWeek') {
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1);
      from.setDate(diff);
      to.setDate(from.getDate() + 6);
      return { from, to };
    }
    if (id === 'lastWeek') {
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1) - 7;
      from.setDate(diff);
      to.setDate(from.getDate() + 6);
      return { from, to };
    }
    if (id === 'thisMonth') {
      from.setDate(1);
      to.setMonth(to.getMonth() + 1, 0);
      return { from, to };
    }
    if (id === 'lastMonth') {
      from.setMonth(from.getMonth() - 1, 1);
      to.setDate(0);
      return { from, to };
    }
    if (id.startsWith('m')) {
      const monthIndex = parseInt(id.replace('m', '')) - 1;
      const targetYear = customYearValue ? parseInt(customYearValue) : today.getFullYear();
      from.setFullYear(targetYear, monthIndex, 1);
      to.setFullYear(targetYear, monthIndex + 1, 0);
      return { from, to };
    }
    if (id.startsWith('q')) {
      const qIndex = parseInt(id.replace('q', '')) - 1;
      const startMonth = qIndex * 3;
      const targetYear = customYearValue ? parseInt(customYearValue) : today.getFullYear();
      from.setFullYear(targetYear, startMonth, 1);
      to.setFullYear(targetYear, startMonth + 3, 0);
      return { from, to };
    }
    if (id === 'thisYear') {
      from.setMonth(0, 1);
      to.setMonth(11, 31);
      return { from, to };
    }
    if (id === 'lastYear') {
      from.setFullYear(from.getFullYear() - 1, 0, 1);
      to.setFullYear(to.getFullYear() - 1, 11, 31);
      return { from, to };
    }
    if (id === 'customYear') {
      const targetYear = customYearValue ? parseInt(customYearValue) : today.getFullYear();
      from.setFullYear(targetYear, 0, 1);
      to.setFullYear(targetYear, 11, 31);
      return { from, to };
    }

    return { from: undefined, to: undefined };
  };

  const handleSelect = (id: string) => {
    if (id === 'customYear') {
      setSelectedId(id);
      return; 
    }
    setSelectedId(id);
    const range = getRangeFromId(id);
    onUpdate({ range });
    setIsOpen(false);
  };

  const handleApplyCustomYear = () => {
    setSelectedId('customYear');
    const range = getRangeFromId('customYear', customYearStr);
    onUpdate({ range });
    setIsOpen(false);
  };

  // Initially call onUpdate on mount to set defaults? Handled by parent.
  
  const getSelectedLabel = () => {
    const all = [...PRESETS, ...MONTHS, ...QUARTERS, ...YEARS];
    const found = all.find(x => x.id === selectedId);
    if (selectedId === 'customYear') {
      return `Năm ${customYearStr}`;
    }
    return found ? found.label : 'Chọn kỳ báo cáo...';
  };

  const trigger = (
    <button onClick={(e) => {
        if (inline) {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
    }} className={clsx("flex items-center justify-between px-3 h-[38px] bg-white border border-border rounded-xl shadow-sm text-foreground hover:bg-muted/50 transition-colors font-bold text-[13px] w-full md:w-[200px]", className)}>
        <div className="flex items-center gap-2">
        <CalendarIcon size={15} className="text-muted-foreground" />
        <span className="truncate">{getSelectedLabel()}</span>
        </div>
        <ChevronDown size={14} className="text-muted-foreground opacity-70" />
    </button>
  );

  const content = (
    <div className="bg-card w-full flex flex-col max-h-[400px]">
        {!inline && (
            <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h4 className="font-bold text-[14px]">Kỳ báo cáo</h4>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 py-3 flex flex-col gap-4">
        {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={clsx(
                    "px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-left flex justify-between items-center",
                    selectedId === p.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  {p.label}
                  {selectedId === p.id && <Check size={14} />}
                </button>
              ))}
            </div>

            <div className="w-full h-px bg-border my-1" />

            {/* Months */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground px-2">Theo Tháng</span>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className={clsx(
                      "px-2 py-1.5 text-[12px] font-medium rounded-lg transition-colors text-center",
                      selectedId === m.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground bg-muted/20"
                    )}
                  >
                    T.{m.id.replace('m', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Quarters */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground px-2">Theo Quý</span>
              <div className="grid grid-cols-4 gap-1.5">
                {QUARTERS.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelect(q.id)}
                    className={clsx(
                      "px-2 py-1.5 text-[12px] font-medium rounded-lg transition-colors text-center",
                      selectedId === q.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground bg-muted/20"
                    )}
                  >
                    {q.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-border my-1" />

            {/* Years */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground px-2">Theo Năm</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSelect('thisYear')}
                  className={clsx(
                    "px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-left",
                    selectedId === 'thisYear' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  Năm nay
                </button>
                <button
                  onClick={() => handleSelect('lastYear')}
                  className={clsx(
                    "px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-left",
                    selectedId === 'lastYear' ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                  )}
                >
                  Năm ngoái
                </button>
              </div>
              <div className={clsx("mt-1 p-3 rounded-xl border transition-all", selectedId === 'customYear' ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-transparent")}>
                <label className="text-[12px] font-bold mb-2 flex items-center gap-2">
                  <input type="radio" checked={selectedId === 'customYear'} onChange={() => setSelectedId('customYear')} className="text-primary focus:ring-primary h-3 w-3" />
                  Năm bất kỳ ({customYearStr})
                </label>
                {selectedId === 'customYear' && (
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={customYearStr}
                      onChange={(e) => setCustomYearStr(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-[13px] font-bold bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="VD: 2025"
                    />
                    <button onClick={handleApplyCustomYear} className="px-3 py-1.5 bg-primary text-white font-bold text-[13px] rounded-lg shadow-sm hover:bg-primary/90">
                      Chọn
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col w-full relative z-10 w-full">
        {trigger}
        <div className={clsx(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
        )}>
          <div className="overflow-hidden">
            <div className="rounded-2xl border border-border/60 shadow-sm bg-white flex flex-col w-[calc(100vw-3rem)]">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 rounded-2xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};
