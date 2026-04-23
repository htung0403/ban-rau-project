import React, { useState } from 'react';

const digitsOnly = (s: string) => s.replace(/\D/g, '');

const intToDigitString = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.trunc(n));
};

export interface VnUnitPriceInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (vnd: number) => void;
}

/**
 * Đơn giá VND: hiển thị theo locale vi-VN (dấu chấm phân cách hàng nghìn).
 * value / onChange là số đồng đầy đủ, không tự nhân 1000.
 */
const VnUnitPriceInput: React.FC<VnUnitPriceInputProps> = ({
  value,
  onChange,
  disabled,
  className,
  placeholder = '0',
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formattedWhenBlurred = value > 0 ? new Intl.NumberFormat('vi-VN').format(Math.trunc(value)) : '';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setDraft(intToDigitString(value));
    onFocusProp?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    if (!disabled) {
      const vnd = parseInt(digitsOnly(draft), 10) || 0;
      onChange(vnd);
    }
    setDraft('');
    onBlurProp?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = digitsOnly(e.target.value);
    setDraft(d);
  };

  let displayValue: string;
  if (focused) {
    if (draft === '') displayValue = '';
    else {
      const n = parseInt(draft, 10);
      displayValue = Number.isFinite(n) && n >= 0 ? new Intl.NumberFormat('vi-VN').format(n) : '';
    }
  } else {
    displayValue = formattedWhenBlurred;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  );
};

export default VnUnitPriceInput;
