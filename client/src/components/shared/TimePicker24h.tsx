import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  value: string; // Expected format: "HH:mm"
  onChange: (value: string) => void;
  className?: string;
}

export const TimePicker24h: React.FC<Props> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse value "HH:mm". Handle cases safely.
  const [hh, mm] = (value || '00:00').split(':');
  
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const hourRef = useRef<HTMLButtonElement | null>(null);
  const minRef = useRef<HTMLButtonElement | null>(null);

  // Auto scroll to active selections when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        hourRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        minRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={clsx(
            "flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
            className
          )}
        >
          <span>{value || '00:00'}</span>
          <Clock size={16} className="text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-2 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border-border bg-white flex justify-between">
        <div className="flex-1 h-56 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1 border-r border-border/50">
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[11px] font-bold text-slate-500 text-center py-1 pb-2">Giờ</div>
          {hours.map(h => {
            const isSelected = h === hh;
            return (
              <button
                key={h}
                type="button"
                ref={isSelected ? hourRef : null}
                onClick={() => onChange(`${h}:${mm || '00'}`)}
                className={clsx(
                  "py-1.5 px-2 text-[13px] rounded-lg text-center transition-colors font-medium",
                  isSelected ? "bg-primary text-white font-bold" : "hover:bg-slate-100 text-slate-700"
                )}
              >
                {h}
              </button>
            )
          })}
        </div>
        <div className="flex-1 h-56 overflow-y-auto custom-scrollbar flex flex-col gap-1 pl-1">
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm text-[11px] font-bold text-slate-500 text-center py-1 pb-2">Phút</div>
          {minutes.map(m => {
            const isSelected = m === mm;
            return (
              <button
                key={m}
                type="button"
                ref={isSelected ? minRef : null}
                onClick={() => onChange(`${hh || '00'}:${m}`)}
                className={clsx(
                  "py-1.5 px-2 text-[13px] rounded-lg text-center transition-colors font-medium",
                  isSelected ? "bg-primary text-white font-bold" : "hover:bg-slate-100 text-slate-700"
                )}
              >
                {m}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
