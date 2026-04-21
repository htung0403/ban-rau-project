import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { normalizeQuery } from "../../lib/str-utils"

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'> {
  onSearch?: (query: string, normalizedQuery: string) => void
  containerClassName?: string
  defaultValue?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, onSearch, onChange, defaultValue = "", ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      
      onChange?.(e)
      onSearch?.(newValue, normalizeQuery(newValue))
    }

    const handleClear = () => {
      setInternalValue("")
      onSearch?.("", "")
      
      if (inputRef.current) {
        inputRef.current.value = ""
        const event = new Event("input", { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }
    }

    return (
      <div className={cn("relative flex items-center w-full", containerClassName)}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground/60" />
        <input
          {...props}
          ref={inputRef}
          value={internalValue}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-xl border border-border/80 bg-muted/10 pl-9 pr-9 py-2 text-[13px] font-medium transition-all hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground/40 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }
