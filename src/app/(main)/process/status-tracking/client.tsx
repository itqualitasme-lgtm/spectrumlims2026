"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Search, RotateCcw, Loader2, Check, X } from "lucide-react"
import {
  getStatusTrackingData,
  searchCustomersForTracking,
} from "@/actions/status-tracking"

type RegistrationRow = {
  id: string
  registrationNumber: string
  client: string
  sampleTypes: string
  sampleCount: number
  reference: string | null
  status: string
  testCount: number
  registeredAt: string
  dueDate: string | null
  testedDate: string | null
  releasedDate: string | null
  hasProforma: boolean
  hasTaxInvoice: boolean
}

type CustomerOption = { id: string; name: string }

const statusColors: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  assigned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  testing: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  reported: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  mixed: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
}

function formatDate(iso: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  })
}

export function StatusTrackingClient() {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [sampleNumber, setSampleNumber] = useState("")
  const [isPending, startTransition] = useTransition()

  // Customer search
  const [customerQuery, setCustomerQuery] = useState("")
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleCustomerSearch(query: string) {
    setCustomerQuery(query)
    if (selectedCustomer) setSelectedCustomer(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (query.length < 2) {
      setCustomerOptions([])
      setShowDropdown(false)
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchingCustomers(true)
      try {
        const results = await searchCustomersForTracking(query)
        setCustomerOptions(results)
        setShowDropdown(true)
      } finally {
        setSearchingCustomers(false)
      }
    }, 300)
  }

  function selectCustomer(c: CustomerOption) {
    setSelectedCustomer(c)
    setCustomerQuery(c.name)
    setShowDropdown(false)
  }

  function handleSearch() {
    if (!selectedCustomer && !sampleNumber.trim() && !fromDate && !toDate) return

    startTransition(async () => {
      const result = await getStatusTrackingData({
        clientId: selectedCustomer?.id,
        sampleNumber: sampleNumber.trim() || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setRegistrations(result.registrations)
      setHasSearched(true)
    })
  }

  function handleReset() {
    setFromDate("")
    setToDate("")
    setSampleNumber("")
    setCustomerQuery("")
    setSelectedCustomer(null)
    setCustomerOptions([])
    setRegistrations([])
    setHasSearched(false)
  }

  const columns: ColumnDef<RegistrationRow>[] = [
    {
      accessorKey: "registrationNumber",
      header: "Reg #",
      cell: ({ row }) => (
        <span className="font-medium font-mono text-[10px] whitespace-nowrap">
          {row.original.registrationNumber}
        </span>
      ),
    },
    {
      accessorKey: "client",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[120px] block">{row.original.client}</span>
      ),
    },
    {
      accessorKey: "sampleTypes",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[100px] block">{row.original.sampleTypes}</span>
      ),
    },
    {
      accessorKey: "sampleCount",
      header: "Qty",
      cell: ({ row }) => (
        <span className="text-[10px] font-medium">{row.original.sampleCount}</span>
      ),
    },
    {
      accessorKey: "reference",
      header: "PO/Ref",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[60px] block">{row.original.reference || "-"}</span>
      ),
    },
    {
      accessorKey: "testCount",
      header: "Tests",
      cell: ({ row }) => (
        <span className="text-[10px] font-medium">{row.original.testCount}</span>
      ),
    },
    {
      accessorKey: "registeredAt",
      header: "Received",
      cell: ({ row }) => <span className="text-[10px] whitespace-nowrap">{formatDate(row.original.registeredAt)}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => {
        const due = row.original.dueDate
        if (!due) return <span className="text-[10px]">-</span>
        const isOverdue = new Date(due) < new Date() && row.original.status !== "completed" && row.original.status !== "reported"
        return (
          <span className={`text-[10px] whitespace-nowrap ${isOverdue ? "text-destructive font-medium" : ""}`}>
            {formatDate(due)}
          </span>
        )
      },
    },
    {
      accessorKey: "testedDate",
      header: "Tested",
      cell: ({ row }) => <span className="text-[10px] whitespace-nowrap">{formatDate(row.original.testedDate)}</span>,
    },
    {
      accessorKey: "releasedDate",
      header: "Released",
      cell: ({ row }) => <span className="text-[10px] whitespace-nowrap">{formatDate(row.original.releasedDate)}</span>,
    },
    {
      accessorKey: "hasProforma",
      header: "PF",
      cell: ({ row }) => (
        row.original.hasProforma
          ? <Check className="h-3 w-3 text-green-600" />
          : <X className="h-3 w-3 text-muted-foreground/40" />
      ),
    },
    {
      accessorKey: "hasTaxInvoice",
      header: "Inv",
      cell: ({ row }) => (
        row.original.hasTaxInvoice
          ? <Check className="h-3 w-3 text-green-600" />
          : <X className="h-3 w-3 text-muted-foreground/40" />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge className={`text-[9px] px-1.5 py-0 ${statusColors[s] || ""}`} variant="outline">
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        )
      },
    },
  ]

  const hasFilters = !!selectedCustomer || !!sampleNumber.trim() || !!fromDate || !!toDate

  return (
    <div className="space-y-2">
      <PageHeader
        title="Status Tracking"
        description="Search by customer, registration number, or date range"
      />

      <Card>
        <CardContent className="py-2">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-0.5 relative" ref={dropdownRef}>
              <Label className="text-[10px]">Customer</Label>
              <div className="relative">
                <Input
                  className="h-7 w-52 text-xs"
                  placeholder="Type customer name..."
                  value={customerQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => { if (customerOptions.length > 0) setShowDropdown(true) }}
                />
                {searchingCustomers && (
                  <Loader2 className="absolute right-2 top-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              {showDropdown && customerOptions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-52 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {customerOptions.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                      onClick={() => selectCustomer(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px]">Reg. No</Label>
              <Input
                className="h-7 w-36 text-xs"
                placeholder="REG-260226..."
                value={sampleNumber}
                onChange={(e) => setSampleNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px]">From</Label>
              <Input
                type="date"
                className="h-7 w-[120px] text-xs"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">To</Label>
              <Input
                type="date"
                className="h-7 w-[120px] text-xs"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <Button size="sm" className="h-7 text-xs" onClick={handleSearch} disabled={isPending || !hasFilters}>
              <Search className="mr-1 h-3 w-3" />
              {isPending ? "..." : "Search"}
            </Button>
            {hasSearched && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleReset}>
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-xs">
            Select a customer, enter a registration number, or choose a date range to search.
          </CardContent>
        </Card>
      ) : registrations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-xs">
            No registrations found for the selected criteria.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={registrations}
          searchPlaceholder="Filter results..."
          searchKey="registrationNumber"
          pageSize={20}
          hideSearch
          compact
        />
      )}
    </div>
  )
}
