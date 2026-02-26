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
import { Search, RotateCcw, Loader2 } from "lucide-react"
import {
  getStatusTrackingData,
  searchCustomersForTracking,
} from "@/actions/status-tracking"
import Link from "next/link"

type SampleRow = {
  id: string
  sampleNumber: string
  registrationNumber: string | null
  client: string
  sampleType: string
  reference: string | null
  status: string
  testCount: number
  registeredAt: string
  dueDate: string | null
  completionDate: string | null
  reportApprovedAt: string | null
}

type CustomerOption = { id: string; name: string }

const statusColors: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  assigned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  testing: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  reported: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
}

function formatDate(iso: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function StatusTrackingClient() {
  const [samples, setSamples] = useState<SampleRow[]>([])
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

  // Close dropdown on outside click
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
      setSamples(result.samples)
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
    setSamples([])
    setHasSearched(false)
  }

  const columns: ColumnDef<SampleRow>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <Link
          href={`/process/registration/${row.original.id}`}
          className="text-primary hover:underline font-medium text-xs"
        >
          {row.original.sampleNumber}
        </Link>
      ),
    },
    {
      accessorKey: "registrationNumber",
      header: "Reg #",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.registrationNumber || "-"}
        </span>
      ),
    },
    {
      accessorKey: "client",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.client}</span>
      ),
    },
    {
      accessorKey: "sampleType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.sampleType}</span>
      ),
    },
    {
      accessorKey: "reference",
      header: "PO/Ref",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.reference || "-"}</span>
      ),
    },
    {
      accessorKey: "testCount",
      header: "Tests",
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.testCount}</span>
      ),
    },
    {
      accessorKey: "registeredAt",
      header: "Received",
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.registeredAt)}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => {
        const due = row.original.dueDate
        if (!due) return <span className="text-xs">-</span>
        const isOverdue = new Date(due) < new Date() && row.original.status !== "completed" && row.original.status !== "reported"
        return (
          <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : ""}`}>
            {formatDate(due)}
          </span>
        )
      },
    },
    {
      accessorKey: "completionDate",
      header: "Completed",
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.completionDate)}</span>,
    },
    {
      accessorKey: "reportApprovedAt",
      header: "Approved",
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.reportApprovedAt)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[s] || ""}`} variant="outline">
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        )
      },
    },
  ]

  const hasFilters = !!selectedCustomer || !!sampleNumber.trim() || !!fromDate || !!toDate

  return (
    <div className="space-y-3">
      <PageHeader
        title="Status Tracking"
        description="Search by customer, registration number, or date range"
      />

      {/* Search Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-end gap-2 flex-wrap">
            {/* Customer Search */}
            <div className="space-y-1 relative" ref={dropdownRef}>
              <Label className="text-xs">Customer</Label>
              <div className="relative">
                <Input
                  className="h-8 w-56"
                  placeholder="Type customer name..."
                  value={customerQuery}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => { if (customerOptions.length > 0) setShowDropdown(true) }}
                />
                {searchingCustomers && (
                  <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {showDropdown && customerOptions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-56 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {customerOptions.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      onClick={() => selectCustomer(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sample Number */}
            <div className="space-y-1">
              <Label className="text-xs">Reg. No</Label>
              <Input
                className="h-8 w-40"
                placeholder="SPL-260226..."
                value={sampleNumber}
                onChange={(e) => setSampleNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-8 w-32"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-8 w-32"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <Button size="sm" onClick={handleSearch} disabled={isPending || !hasFilters}>
              <Search className="mr-1 h-3.5 w-3.5" />
              {isPending ? "Searching..." : "Search"}
            </Button>
            {hasSearched && (
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!hasSearched ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Select a customer, enter a registration number, or choose a date range to search.
          </CardContent>
        </Card>
      ) : samples.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No registrations found for the selected criteria.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={samples}
          searchPlaceholder="Filter results..."
          searchKey="sampleNumber"
          pageSize={20}
          hideSearch
        />
      )}
    </div>
  )
}
