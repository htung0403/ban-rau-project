import * as React from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { removeAccents } from "../../lib/str-utils"
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

export interface CreatableOption {
  value: string
  label: string
  /** So khớp «tạo mới» không phân biệt hoa thường (vd tên khách / tên hàng); bỏ qua hậu tố SĐT trong label. */
  matchKey?: string
}

function compareKeyFromOption(option: CreatableOption): string {
  if (option.matchKey != null && String(option.matchKey).trim() !== '') {
    return option.matchKey.trim().toLowerCase()
  }
  const label = option.label.trim()
  const paren = label.lastIndexOf(' (')
  if (paren !== -1 && label.endsWith(')')) {
    return label.slice(0, paren).trim().toLowerCase()
  }
  return label.toLowerCase()
}

interface CreatableSearchableSelectProps {
  options: CreatableOption[]
  value?: string
  fallbackLabel?: string
  onValueChange: (value: string) => void
  onCreate?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  createMessage?: string
  className?: string
  disabled?: boolean
}

export const CreatableSearchableSelect = React.memo((props: CreatableSearchableSelectProps) => {
  const {
    options,
    value,
    fallbackLabel,
    onValueChange,
    onCreate,
    placeholder = "Chọn hoặc tạo mới...",
    searchPlaceholder = "Tìm kiếm hoặc nhập tên mới...",
    emptyMessage = "Không tìm thấy kết quả.",
    createMessage = "Thêm mới",
    className,
    disabled = false,
  } = props;
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedOption = React.useMemo(() => 
    options.find((option) => option.value === value),
    [options, value]
  )
  
  const hasExactMatch = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return false
    return options.some((option) => compareKeyFromOption(option) === q)
  }, [options, searchQuery])

  const handleCreate = React.useCallback(() => {
    if (searchQuery && !hasExactMatch && onCreate) {
      onCreate(searchQuery)
      setOpen(false)
      setSearchQuery("")
    }
  }, [searchQuery, hasExactMatch, onCreate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-border/80 bg-muted/10 px-4 py-2 text-[13px] font-medium transition-all hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/10",
            open && "border-primary ring-2 ring-primary/5",
            !value && "text-muted-foreground/60",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : fallbackLabel ? fallbackLabel : value ? value : placeholder}
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {value && !disabled && (
              <X
                size={14}
                className="text-muted-foreground/40 hover:text-red-500 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange("")
                  setSearchQuery("")
                }}
              />
            )}
            <ChevronDown
              size={16}
              className={cn(
                "text-muted-foreground/40 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-border/60">
         <Command
            className="rounded-xl overflow-hidden"
            filter={(val, search) => {
              const normalizedValue = removeAccents(val).toLowerCase();
              const normalizedSearch = removeAccents(search).toLowerCase();
              return normalizedValue.includes(normalizedSearch) ? 1 : 0;
            }}
          >
          <CommandInput 
            placeholder={searchPlaceholder} 
            onValueChange={setSearchQuery}
            className="h-10 border-none px-0 text-[13px] focus:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate()
              }
            }}
          />
          <CommandList className="max-h-60 p-1">
            <CommandEmpty className="py-2 text-center text-[12px] text-muted-foreground">
              {emptyMessage}
            </CommandEmpty>
            
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-[13px] font-medium transition-colors hover:bg-primary/5",
                    value === option.value && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  {option.label}
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          
          {/* Nút tạo mới đặt ngoài CommandList để tránh cmdk quản lý và gây lỗi Node */}
          {searchQuery && !hasExactMatch && onCreate && (
            <div className="border-t border-border/40 p-1 bg-muted/5">
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-[13px] font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <Plus size={14} />
                <span>{createMessage}: "{searchQuery}"</span>
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
})
