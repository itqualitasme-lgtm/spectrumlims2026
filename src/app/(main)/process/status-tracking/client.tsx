"use client"

import { useState, useMemo, useTransition, useRef, useEffect } from "react"
import { formatDate } from "@/lib/utils"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Search, RotateCcw, Loader2, Check, X, Download } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  priority: string
  status: string
  testCount: number
  registeredAt: string
  dueDate: string | null
  testedDate: string | null
  releasedDate: string | null
  sheetNumber: string | null
  samplingMethod: string | null
  drawnBy: string | null
  deliveredBy: string | null
  collectionDate: string | null
  collectionLocation: string | null
  revisionCount: number
  hasProforma: boolean
  hasTaxInvoice: boolean
  samplerName: string | null
  registeredByName: string | null
  reportedByName: string | null
  isComposite: boolean
}

type CustomerOption = { id: string; name: string }

const statusConfig: Record<string, { label: string; color: string }> = {
  registered: { label: "Registered", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  assigned: { label: "Assigned", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  testing: { label: "Testing", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  auth_pending: { label: "Auth. Pending", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  reported: { label: "Reported", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  revision_reg: { label: "Rev. Registration", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  revision_chemist: { label: "Rev. Chemist", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  revision_auth: { label: "Rev. Auth. Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  mixed: { label: "Mixed", color: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300" },
}


export function StatusTrackingClient() {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [sampleNumber, setSampleNumber] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [invoiceFilter, setInvoiceFilter] = useState("all")
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

  const filteredRegistrations = useMemo(() => {
    let filtered = registrations

    // Status filter (client-side since statuses are now computed)
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }

    // Invoice filter
    if (invoiceFilter === "not_invoiced") filtered = filtered.filter((r) => !r.hasProforma && !r.hasTaxInvoice)
    else if (invoiceFilter === "proforma_only") filtered = filtered.filter((r) => r.hasProforma && !r.hasTaxInvoice)
    else if (invoiceFilter === "invoiced") filtered = filtered.filter((r) => r.hasTaxInvoice)
    return filtered
  }, [registrations, statusFilter, invoiceFilter])

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
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
      })
      setRegistrations(result.registrations)
      setHasSearched(true)
    })
  }

  function handleReset() {
    setFromDate("")
    setToDate("")
    setSampleNumber("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setInvoiceFilter("all")
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
        <span className="text-[10px] font-medium">
          {row.original.sampleCount}
          {row.original.isComposite && <span className="ml-1 text-[9px] text-muted-foreground" title="Composite">C</span>}
        </span>
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
      accessorKey: "sheetNumber",
      header: "Sheet#",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[60px] block">{row.original.sheetNumber || "-"}</span>
      ),
    },
    {
      accessorKey: "samplingMethod",
      header: "Sampling",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[60px] block">{row.original.samplingMethod || "-"}</span>
      ),
    },
    {
      accessorKey: "drawnBy",
      header: "Drawn By",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.drawnBy || "-"}</span>
      ),
    },
    {
      accessorKey: "deliveredBy",
      header: "Delivered By",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.deliveredBy || "-"}</span>
      ),
    },
    {
      accessorKey: "collectionDate",
      header: "Collected",
      cell: ({ row }) => <span className="text-[10px] whitespace-nowrap">{formatDate(row.original.collectionDate)}</span>,
    },
    {
      accessorKey: "collectionLocation",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.collectionLocation || "-"}</span>
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
      accessorKey: "samplerName",
      header: "Sampler",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.samplerName || "-"}</span>
      ),
    },
    {
      accessorKey: "registeredByName",
      header: "Reg. By",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.registeredByName || "-"}</span>
      ),
    },
    {
      accessorKey: "reportedByName",
      header: "Reported By",
      cell: ({ row }) => (
        <span className="text-[10px] truncate max-w-[80px] block">{row.original.reportedByName || "-"}</span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const p = row.original.priority
        const colors: Record<string, string> = {
          urgent: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
          rush: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        }
        if (p === "normal") return <span className="text-[10px]">Normal</span>
        return (
          <Badge className={`text-[9px] px-1.5 py-0 ${colors[p] || ""}`} variant="outline">
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Badge>
        )
      },
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
      accessorKey: "revisionCount",
      header: "Rev",
      cell: ({ row }) => {
        const c = row.original.revisionCount
        return c > 0
          ? <span className="text-[10px] font-medium text-amber-600">{c}</span>
          : <span className="text-muted-foreground/30 text-xs">-</span>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const cfg = statusConfig[s] || { label: s, color: "" }
        return (
          <Badge className={`text-[9px] px-1.5 py-0 whitespace-nowrap ${cfg.color}`} variant="outline">
            {cfg.label}
          </Badge>
        )
      },
    },
  ]

  function handleExportCSV() {
    const headers = [
      "Reg #", "Customer", "Type", "Qty", "Composite", "PO/Ref", "Sheet#", "Sampling",
      "Drawn By", "Delivered By", "Collected", "Location", "Tests", "Received",
      "Due", "Tested", "Released", "Sampler", "Registered By", "Reported By",
      "Priority", "Proforma", "Invoice", "Revisions", "Status",
    ]
    const rows = filteredRegistrations.map((r) => [
      r.registrationNumber,
      r.client,
      r.sampleTypes,
      r.sampleCount,
      r.isComposite ? "Yes" : "No",
      r.reference || "",
      r.sheetNumber || "",
      r.samplingMethod || "",
      r.drawnBy || "",
      r.deliveredBy || "",
      formatDate(r.collectionDate),
      r.collectionLocation || "",
      r.testCount,
      formatDate(r.registeredAt),
      formatDate(r.dueDate),
      formatDate(r.testedDate),
      formatDate(r.releasedDate),
      r.samplerName || "",
      r.registeredByName || "",
      r.reportedByName || "",
      r.priority.charAt(0).toUpperCase() + r.priority.slice(1),
      r.hasProforma ? "Yes" : "No",
      r.hasTaxInvoice ? "Yes" : "No",
      r.revisionCount,
      statusConfig[r.status]?.label || r.status,
    ])

    const escapeCsv = (val: string | number) => {
      const s = String(val)
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const filterParts = [
      "status-tracking",
      fromDate && toDate ? `${fromDate}-to-${toDate}` : fromDate || toDate || "",
      selectedCustomer ? selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 20) : "",
      statusFilter !== "all" ? statusFilter : "",
      priorityFilter !== "all" ? priorityFilter : "",
      invoiceFilter !== "all" ? invoiceFilter : "",
    ].filter(Boolean).join("_")
    a.download = `${filterParts}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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

            <div className="space-y-0.5">
              <Label className="text-[10px]">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="auth_pending">Auth. Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="revision_reg">Rev. Registration</SelectItem>
                  <SelectItem value="revision_chemist">Rev. Chemist</SelectItem>
                  <SelectItem value="revision_auth">Rev. Auth. Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px]">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-[10px]">Invoice</Label>
              <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                <SelectTrigger className="h-7 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
                  <SelectItem value="proforma_only">Proforma Only</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button size="sm" className="h-7 text-xs" onClick={handleSearch} disabled={isPending || !hasFilters}>
              <Search className="mr-1 h-3 w-3" />
              {isPending ? "..." : "Search"}
            </Button>
            {hasSearched && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleReset}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                {filteredRegistrations.length > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExportCSV}>
                    <Download className="mr-1 h-3 w-3" />
                    Export
                  </Button>
                )}
              </>
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
      ) : filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-xs">
            No registrations found for the selected criteria.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRegistrations}
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
