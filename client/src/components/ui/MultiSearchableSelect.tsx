import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

interface Option {
  value: string
  label: string
}

interface MultiSearchableSelectProps {
  options: Option[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  inline?: boolean
  icon?: React.ReactNode
}

export function MultiSearchableSelect({
  options,
  value = [],
  onValueChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không có kết quả.",
  className,
  disabled = false,
  inline = false,
  icon,
}: MultiSearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter(opt => value.includes(opt.value))
  
  let displayText = placeholder;
  if (value.length === 1) {
    displayText = selectedOptions[0]?.label || placeholder;
  } else if (value.length > 1) {
    displayText = `${value.length} đã chọn`;
  }

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter(v => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange([]);
  }

  const trigger = (
    <button
      disabled={disabled}
      onClick={() => inline && setOpen(!open)}
      className={cn(
        "flex h-[38px] w-full items-center justify-between rounded-xl border border-border bg-white shadow-sm px-3 py-2 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10",
        open && "border-primary ring-2 ring-primary/5",
        value.length > 0 && "text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {icon && <span className="text-muted-foreground/60 shrink-0">{icon}</span>}
        <span className="truncate">
          {displayText}
        </span>
      </div>
      <div className="flex items-center gap-1.5 ml-2 shrink-0">
        {value.length > 0 && !disabled && (
          <X
            size={14}
            className="text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
            onClick={handleClear}
          />
        )}
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground/40 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </div>
    </button>
  );

  const content = (
    <Command className="rounded-xl overflow-hidden">
      <CommandInput 
        placeholder={searchPlaceholder} 
        className="h-10 border-none text-[13px] focus:ring-0"
      />
      <CommandList className="max-h-60 p-1">
        <CommandEmpty className="py-6 text-[12px] text-muted-foreground">
          {emptyMessage}
        </CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => toggleOption(option.value)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-[13px] font-medium transition-colors hover:bg-primary/5",
                  isSelected && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border border-primary/50",
                    isSelected ? "bg-primary border-primary" : "bg-transparent text-transparent"
                  )}>
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  {option.label}
                </div>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (inline) {
    return (
      <div className="flex flex-col w-full">
        {trigger}
        <div className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
        )}>
          <div className="overflow-hidden">
            <div className="rounded-2xl border border-border/60 shadow-sm bg-white">
              {content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-border/60">
        {content}
      </PopoverContent>
    </Popover>
  )
}
