import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  className,
  align = 'end'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={clsx(
            "flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border border-border/80 rounded-xl hover:bg-muted/30 transition-all text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/10",
            className
          )}
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDownIcon size={14} className="opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      {/* Set a min width to match trigger or let it expand based on content */}
      <PopoverContent align={align} className="min-w-[140px] w-[var(--radix-popover-trigger-width)] p-1.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-border/60">
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={clsx(
                "flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors text-left",
                value === opt.value
                  ? "bg-primary text-white font-bold"
                  : "hover:bg-muted text-foreground font-medium"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
