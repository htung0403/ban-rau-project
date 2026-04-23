import React, { forwardRef, useState, useEffect } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | string | null;
  onChange?: (value: number | undefined) => void;
}

function formatVnInteger(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
      if (value !== undefined && value !== null && value !== '') {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
          setDisplayValue(formatVnInteger(numValue));
        } else {
          setDisplayValue('');
        }
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      if (!rawValue) {
        setDisplayValue('');
        if (onChange) onChange(undefined);
        return;
      }

      const numValue = parseInt(rawValue, 10);
      setDisplayValue(formatVnInteger(numValue));
      if (onChange) onChange(numValue);
    };

    return (
      <input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
