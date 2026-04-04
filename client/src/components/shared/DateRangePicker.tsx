'use client'

import { type FC, useState, useEffect, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { CustomSelect } from './CustomSelect'
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DateRangePickerProps {
  onUpdate?: (values: { range: DateRange }) => void
  initialDateFrom?: Date | string
  initialDateTo?: Date | string
  align?: 'start' | 'center' | 'end'
  locale?: string
}

const formatDate = (date: Date, locale: string = 'vi-VN'): string => {
  return date.toLocaleDateString(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

const getDateAdjustedForTimezone = (dateInput: Date | string | undefined): Date | undefined => {
  if (!dateInput) return undefined;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map((part) => parseInt(part, 10))
    if (parts.length !== 3) return undefined;
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    return date
  } else {
    return dateInput
  }
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
}

const PRESETS: Preset[] = [
  { name: 'today', label: 'Hôm nay' },
  { name: 'yesterday', label: 'Hôm qua' },
  { name: 'last7', label: '7 ngày qua' },
  { name: 'last30', label: '30 ngày qua' },
  { name: 'thisMonth', label: 'Tháng này' },
  { name: 'lastMonth', label: 'Tháng trước' }
]

export const DateRangePicker: FC<DateRangePickerProps> = ({
  initialDateFrom,
  initialDateTo,
  onUpdate,
  align = 'end',
  locale = 'vi-VN',
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom),
    to: getDateAdjustedForTimezone(initialDateTo)
  })

  // Sync external changes
  useEffect(() => {
    if (!isOpen) {
      setRange({
        from: getDateAdjustedForTimezone(initialDateFrom),
        to: getDateAdjustedForTimezone(initialDateTo)
      });
    }
  }, [initialDateFrom, initialDateTo, isOpen]);

  const openedRangeRef = useRef<DateRange | undefined>(undefined)
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  )

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName)
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)
    const from = new Date()
    const to = new Date()

    switch (preset.name) {
      case 'today':
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'yesterday':
        from.setDate(from.getDate() - 1)
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() - 1)
        to.setHours(23, 59, 59, 999)
        break
      case 'last7':
        from.setDate(from.getDate() - 6)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'last30':
        from.setDate(from.getDate() - 29)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'thisMonth':
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'lastMonth':
        from.setMonth(from.getMonth() - 1)
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setDate(0)
        to.setHours(23, 59, 59, 999)
        break
    }
    return { from, to }
  }

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset)
    setRange(range)
  }

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name)

      if (!range.from) {
        setSelectedPreset(undefined);
        return;
      }

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      if (!presetRange.from) continue;

      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      )

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      )

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }
    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    setRange({
      from: getDateAdjustedForTimezone(initialDateFrom),
      to: getDateAdjustedForTimezone(initialDateTo)
    })
  }

  useEffect(() => {
    checkPreset()
  }, [range])

  const PresetButton = ({
    preset,
    label,
    isSelected
  }: {
    preset: string
    label: string
    isSelected: boolean
  }) => (
    <button
      className={cn(
        "w-full text-right px-4 py-2 text-[13px] font-medium rounded-r-2xl border-l-[3px] transition-all",
        isSelected ? "bg-primary/5 text-primary border-primary font-bold" : "border-transparent text-foreground hover:bg-muted/50"
      )}
      onClick={() => setPreset(preset)}
    >
      <div className="flex items-center justify-end gap-2">
        <span className={cn('opacity-0', isSelected && 'opacity-100')}>
          <CheckIcon size={14} className="text-primary" />
        </span>
        {label}
      </div>
    </button>
  )

  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a && !b) return true
    if (!a || !b) return false
    if (!a.from && !b.from && !a.to && !b.to) return true
    if (a.from?.getTime() !== b.from?.getTime()) return false
    if (a.to?.getTime() !== b.to?.getTime()) return false
    return true
  }

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range
    }
  }, [isOpen])

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues()
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center md:justify-between px-3 md:pl-3 md:pr-2 py-2 bg-white border border-border/80 rounded-xl hover:bg-slate-50 transition-all font-medium text-[13px] w-full md:w-[240px]">
          <div className="text-center md:text-left font-medium w-full md:w-auto">
            {range.from ? `${formatDate(range.from, locale)}${range.to != null ? ' - ' + formatDate(range.to, locale) : ''}` : <span className="text-muted-foreground font-normal">Chọn ngày...</span>}
          </div>
          <div className="absolute right-3 md:static opacity-60 text-muted-foreground md:ml-2">
            {isOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0 rounded-2xl border-border/60 shadow-xl overflow-hidden">
        <div className="flex py-2 flex-col md:flex-row">
          <div className="flex">
            <div className="flex flex-col">
              {isSmallScreen && (
                <div className="px-4 py-2">
                  <CustomSelect
                    value={selectedPreset || ''}
                    onChange={(val) => {
                      if (val) setPreset(val)
                    }}
                    options={PRESETS.map(p => ({ value: p.name, label: p.label }))}
                    placeholder="Chọn nhanh..."
                    className="w-full py-2 bg-background border-border"
                  />
                </div>
              )}

              <div className="p-2 border-t md:border-t-0 md:mt-2 border-border/50">
                <Calendar
                  mode="range"
                  onSelect={(value: { from?: Date, to?: Date } | undefined) => {
                    if (value?.from != null) {
                      setRange({ from: value.from, to: value?.to })
                    }
                  }}
                  selected={range}
                  numberOfMonths={isSmallScreen ? 1 : 2}
                  defaultMonth={
                    isSmallScreen ? undefined : new Date(
                      new Date().setMonth(
                        new Date().getMonth() - 1
                      )
                    )
                  }
                />
              </div>
            </div>
          </div>

          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-1 pr-0 w-36 border-l border-border/50 py-2">
              {PRESETS.map((preset) => (
                <PresetButton
                  key={preset.name}
                  preset={preset.name}
                  label={preset.label}
                  isSelected={selectedPreset === preset.name}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border/50 bg-muted/10">
          <button
            onClick={() => {
              setIsOpen(false)
              resetValues()
            }}
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-muted-foreground hover:bg-muted transition-all"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              if (!areRangesEqual(range, openedRangeRef.current)) {
                onUpdate?.({ range })
              }
            }}
            className="px-4 py-2 rounded-xl text-[13px] font-bold bg-primary text-white hover:bg-primary/90 shadow-sm transition-all"
          >
            Áp dụng
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

DateRangePicker.displayName = 'DateRangePicker'
