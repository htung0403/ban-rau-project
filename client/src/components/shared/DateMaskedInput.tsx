import React, { useState, useEffect } from 'react';

interface DateMaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

const DateMaskedInput: React.FC<DateMaskedInputProps> = ({ value = '', onChange, ...props }) => {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const toDisplay = (v: string) => {
    if (!v) return '';
    const parts = v.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return v;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const toValue = (d: string) => {
    if (d.length === 10) {
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return '';
  };

  const isValidPartialDate = (input: string) => {
    if (input.length === 0) return true;
    
    // Day
    if (input.length >= 1) {
      const d1 = parseInt(input[0], 10);
      if (d1 > 3) return false;
    }
    if (input.length >= 2) {
      const day = parseInt(input.slice(0, 2), 10);
      if (day < 1 || day > 31) return false;
    }
    
    // Month
    if (input.length >= 3) {
      const m1 = parseInt(input[2], 10);
      if (m1 > 1) return false;
    }
    if (input.length >= 4) {
      const month = parseInt(input.slice(2, 4), 10);
      if (month < 1 || month > 12) return false;
      
      // Check day in month limit
      const day = parseInt(input.slice(0, 2), 10);
      if (month === 2 && day > 29) return false; 
      if ((month === 4 || month === 6 || month === 9 || month === 11) && day > 30) return false;
    }
    
    // Year
    if (input.length >= 5) {
      const y1 = parseInt(input[4], 10);
      if (y1 !== 1 && y1 !== 2) return false;
    }
    if (input.length === 8) {
      const day = parseInt(input.slice(0, 2), 10);
      const month = parseInt(input.slice(2, 4), 10);
      const year = parseInt(input.slice(4, 8), 10);
      
      if (month === 2 && day === 29) {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeap) return false;
      }
    }
    
    return true;
  };

  const [displayValue, setDisplayValue] = useState(() => toDisplay(value));

  useEffect(() => {
    setDisplayValue(toDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = e.target.value;
    const isDeleting = currentValue.length < displayValue.length;

    let input = currentValue.replace(/\D/g, ''); // strip all non-digits
    if (input.length > 8) input = input.slice(0, 8); // max 8 digits

    if (!isDeleting && !isValidPartialDate(input)) {
      return; // Reject bad input
    }

    let formatted = input;
    
    if (isDeleting) {
      if (input.length > 4) {
        formatted = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4)}`;
      } else if (input.length > 2) {
        formatted = `${input.slice(0, 2)}/${input.slice(2)}`;
      }
    } else {
      if (input.length >= 4) {
        formatted = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4)}`;
      } else if (input.length >= 2) {
        formatted = `${input.slice(0, 2)}/${input.slice(2)}`;
      }
    }

    setDisplayValue(formatted);

    if (onChange) {
      // Allow partial values as empty, or only valid dates
      if (formatted.length === 10) {
        onChange(toValue(formatted));
      } else {
        onChange('');
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
};

export default DateMaskedInput;
