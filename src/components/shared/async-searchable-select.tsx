"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

interface AsyncSearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  searchFn: (query: string) => Promise<{ value: string; label: string }[]>
  getByIdFn?: (id: string) => Promise<{ value: string; label: string } | null>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  selectedLabel?: string
}

export function AsyncSearchableSelect({
  value,
  onValueChange,
  searchFn,
  getByIdFn,
  placeholder = "Search and select...",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No results found.",
  disabled = false,
  selectedLabel: initialSelectedLabel,
}: AsyncSearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState(initialSelectedLabel || "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve label for pre-selected value
  useEffect(() => {
    if (value && !selectedLabel && getByIdFn) {
      getByIdFn(value).then((result) => {
        if (result) setSelectedLabel(result.label)
      })
    }
    if (!value) setSelectedLabel("")
  }, [value, getByIdFn, selectedLabel])

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (!searchQuery || searchQuery.length < 1) {
        setOptions([])
        setLoading(false)
        return
      }

      setLoading(true)
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchFn(searchQuery)
          setOptions(results)
        } catch {
          setOptions([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [searchFn]
  )

  const handleSelect = (optionValue: string, optionLabel: string) => {
    onValueChange(optionValue === value ? "" : optionValue)
    setSelectedLabel(optionValue === value ? "" : optionLabel)
    setOpen(false)
    setQuery("")
    setOptions([])
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setQuery("")
        setOptions([])
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={handleSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && query.length > 0 && options.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {!loading && query.length === 0 && options.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type to search...
              </div>
            )}
            {options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value, option.label)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
