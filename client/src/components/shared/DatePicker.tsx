import React, { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface DatePickerProps {
  value?: string; // Expects "yyyy-MM-dd" for form/backend compatibility
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  className, 
  placeholder = "dd/mm/yyyy" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse standard string to Date object
  let dateObj: Date | undefined = undefined;
  if (value) {
    let parsed = undefined;
    // Handle specific date string formats if needed, standard input is yyyy-MM-dd
    if (value.includes('T')) {
      parsed = new Date(value);
    } else {
      parsed = parseISO(value);
    }
    if (isValid(parsed)) dateObj = parsed;
  }

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={clsx(
            "flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-border rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
            !dateObj && "text-slate-400",
            className
          )}
        >
          <span>{dateObj ? format(dateObj, 'dd/MM/yyyy') : placeholder}</span>
          <CalendarIcon size={16} className="text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border-slate-200 bg-white" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={handleSelect}
          initialFocus
          locale={vi}
        />
      </PopoverContent>
    </Popover>
  );
};
