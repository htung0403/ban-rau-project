import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChevronDown, Filter, X, Check } from 'lucide-react';
import { clsx } from 'clsx';

export interface RangeValue {
  min?: number;
  max?: number;
}

export interface RangePreset {
  id: string;
  label: string;
  shortLabel?: string;
  min?: number;
  max?: number;
}

interface RangeNumberFilterProps {
  label: string;
  value: RangeValue;
  onChange: (val: RangeValue) => void;
  presets?: RangePreset[];
  icon?: React.ReactNode;
  inline?: boolean;
  hideLabelPrefix?: boolean;
}

const formatCurrencyLocal = (val?: number) => {
  if (val === undefined || isNaN(val)) return '';
  return new Intl.NumberFormat('vi-VN').format(val);
};

const formatToShortVND = (val?: number) => {
  if (val === undefined || isNaN(val)) return '';
  if (val >= 1000000000) return `${val / 1000000000} tỷ`;
  if (val >= 1000000) return `${val / 1000000}tr`;
  if (val >= 1000) return `${val / 1000}k`;
  return `${val}đ`;
};

export const RangeNumberFilter: React.FC<RangeNumberFilterProps> = ({ label, value, onChange, presets, icon, inline, hideLabelPrefix }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minStr, setMinStr] = useState<string>(value.min?.toString() || '');
  const [maxStr, setMaxStr] = useState<string>(value.max?.toString() || '');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMinStr(value.min !== undefined ? value.min.toString() : '');
      setMaxStr(value.max !== undefined ? value.max.toString() : '');
      
      // Determine if it matches any preset
      let matched = false;
      if (presets) {
        for (const p of presets) {
          if (p.min === value.min && p.max === value.max) {
            setActivePreset(p.id);
            matched = true;
            break;
          }
        }
      }
      if (!matched && (value.min !== undefined || value.max !== undefined)) {
        setActivePreset('custom');
      } else if (!matched) {
        setActivePreset(null);
      }
    }
  }, [value, isOpen, presets]);

  const handleApply = () => {
    const min = minStr ? parseInt(minStr.replace(/\D/g, '')) : undefined;
    const max = maxStr ? parseInt(maxStr.replace(/\D/g, '')) : undefined;
    
    onChange({ 
      min: isNaN(min as number) ? undefined : min, 
      max: isNaN(max as number) ? undefined : max 
    });
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: RangePreset) => {
    setActivePreset(preset.id);
    setMinStr(preset.min !== undefined ? preset.min.toString() : '');
    setMaxStr(preset.max !== undefined ? preset.max.toString() : '');
    onChange({ min: preset.min, max: preset.max });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ min: undefined, max: undefined });
    setActivePreset(null);
    setMinStr('');
    setMaxStr('');
  };

  const hasValue = value.min !== undefined || value.max !== undefined;

  let displayLabel = label;
  const prefix = hideLabelPrefix ? '' : `${label}: `;
  if (hasValue && activePreset && activePreset !== 'custom' && presets) {
    const p = presets.find(x => x.id === activePreset);
    if (p) displayLabel = p.shortLabel ? `${prefix}${p.shortLabel}` : `${prefix}${p.label}`;
  } else if (hasValue) {
    const minText = formatToShortVND(value.min);
    const maxText = formatToShortVND(value.max);
    if (!value.min && value.max) {
      displayLabel = `${prefix}< ${maxText}`;
    } else if (value.min && !value.max) {
      displayLabel = `${prefix}> ${minText}`;
    } else {
      displayLabel = `${prefix}${minText} - ${maxText}`;
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setActivePreset('custom');
    const raw = e.target.value.replace(/\D/g, '');
    setter(raw);
  };

  const trigger = (
    <button
      onClick={(e) => {
        if (inline) {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }}
      className={clsx(
        "relative flex items-center justify-between px-3 md:pl-3 md:pr-2 h-[38px] bg-white border rounded-xl shadow-sm transition-colors font-bold text-[13px] w-full min-w-[140px] md:w-auto",
        hasValue ? "border-primary/50 text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden w-full md:w-auto justify-center md:justify-start">
        {icon ? icon : <Filter size={15} className="shrink-0" />}
        <span className="truncate max-w-[120px] md:max-w-none text-center md:text-left font-bold">{displayLabel}</span>
      </div>
      {hasValue ? (
        <div onClick={handleClear} className="md:ml-2 shrink-0 p-0.5 hover:bg-primary/20 rounded-md transition-colors ml-2">
          <X size={14} />
        </div>
      ) : (
        <div className="opacity-60 shrink-0 md:ml-2 ml-2">
          <ChevronDown size={14} />
        </div>
      )}
    </button>
  );

  const content = (
    <div className="bg-card w-full flex flex-col">
      {!inline && (
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h4 className="font-bold text-[14px]">Lọc {label.toLowerCase()}</h4>
          </div>
      )}

      <div className="p-3 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {presets && presets.length > 0 && (
              <div className="flex flex-col gap-1 mb-2">
                <span className="text-[11px] font-bold uppercase text-muted-foreground px-1 mb-1">Mốc chọn nhanh</span>
                {presets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p)}
                    className={clsx(
                      "px-3 py-2 text-[13px] font-medium rounded-lg transition-colors text-left flex justify-between items-center",
                      activePreset === p.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                    )}
                  >
                    {p.label}
                    {activePreset === p.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase text-muted-foreground px-1">Tùy chọn khoảng cụ thể</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={minStr ? formatCurrencyLocal(parseInt(minStr)) : ''}
                    onChange={(e) => handleInputChange(e, setMinStr)}
                    placeholder="Từ..."
                    className="w-full pl-3 pr-6 py-2 text-[13px] font-bold bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">đ</span>
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={maxStr ? formatCurrencyLocal(parseInt(maxStr)) : ''}
                    onChange={(e) => handleInputChange(e, setMaxStr)}
                    placeholder="Đến..."
                    className="w-full pl-3 pr-6 py-2 text-[13px] font-bold bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">đ</span>
                </div>
              </div>
            </div>
          </div>
          
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-muted/20">
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(false);
            }}
            className="px-3 py-1.5 text-[12px] font-bold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleApply();
            }}
            className="px-3 py-1.5 text-[12px] font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
          >
            Áp dụng
          </button>
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
            <div className="rounded-2xl border border-border/60 shadow-sm bg-white flex flex-col w-[calc(100vw-3rem)] md:w-full">
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
      <PopoverContent className="w-[300px] p-0 rounded-2xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
};
