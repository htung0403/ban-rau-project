import React, { forwardRef, useState, useEffect } from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number | string | null;
  onChange?: (value: number | undefined) => void;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    useEffect(() => {
      if (value !== undefined && value !== null && value !== '') {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(numValue)) {
          setDisplayValue(new Intl.NumberFormat('vi-VN').format(numValue));
        } else {
          setDisplayValue('');
        }
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '');
      if (!rawValue) {
        setDisplayValue('');
        if (onChange) onChange(undefined);
        return;
      }

      const numValue = parseInt(rawValue, 10);
      setDisplayValue(new Intl.NumberFormat('vi-VN').format(numValue));
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
