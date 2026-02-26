"use client"

import { useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { Filter, RotateCcw } from "lucide-react"
import { getStatusTrackingData } from "@/actions/status-tracking"
import Link from "next/link"

type StatusData = Awaited<ReturnType<typeof getStatusTrackingData>>
type SampleRow = StatusData["samples"][0]

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

export function StatusTrackingClient({ initialData }: { initialData: StatusData }) {
  const [data, setData] = useState(initialData)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [clientId, setClientId] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isPending, startTransition] = useTransition()

  function handleFilter() {
    startTransition(async () => {
      const result = await getStatusTrackingData({
        from: fromDate || undefined,
        to: toDate || undefined,
        clientId: clientId !== "all" ? clientId : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      })
      setData(result)
    })
  }

  function handleReset() {
    setFromDate("")
    setToDate("")
    setClientId("all")
    setStatusFilter("all")
    startTransition(async () => {
      const result = await getStatusTrackingData()
      setData(result)
    })
  }

  function handleStatusClick(status: string) {
    const newStatus = statusFilter === status ? "all" : status
    setStatusFilter(newStatus)
    startTransition(async () => {
      const result = await getStatusTrackingData({
        from: fromDate || undefined,
        to: toDate || undefined,
        clientId: clientId !== "all" ? clientId : undefined,
        status: newStatus !== "all" ? newStatus : undefined,
      })
      setData(result)
    })
  }

  const { sampleStatus } = data
  const totalActive = sampleStatus.registered + sampleStatus.assigned + sampleStatus.testing + sampleStatus.completed + sampleStatus.reported

  const columns: ColumnDef<SampleRow>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <Link
          href={`/process/registration/${row.original.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.sampleNumber}
        </Link>
      ),
    },
    { accessorKey: "client", header: "Customer" },
    { accessorKey: "sampleType", header: "Sample Type" },
    {
      accessorKey: "reference",
      header: "PO/Reference",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.reference || "-"}
        </span>
      ),
    },
    {
      accessorKey: "testCount",
      header: "Tests",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.testCount}</span>
      ),
    },
    {
      accessorKey: "registeredAt",
      header: "Received",
      cell: ({ row }) => formatDate(row.original.registeredAt),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const due = row.original.dueDate
        if (!due) return "-"
        const isOverdue = new Date(due) < new Date() && row.original.status !== "completed" && row.original.status !== "reported"
        return (
          <span className={isOverdue ? "text-destructive font-medium" : ""}>
            {formatDate(due)}
          </span>
        )
      },
    },
    {
      accessorKey: "completionDate",
      header: "Completed",
      cell: ({ row }) => formatDate(row.original.completionDate),
    },
    {
      accessorKey: "reportApprovedAt",
      header: "Approved",
      cell: ({ row }) => formatDate(row.original.reportApprovedAt),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge className={`text-xs ${statusColors[s] || ""}`} variant="outline">
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Status Tracking"
        description="Track sample registration and processing status"
      />

      {/* Filter Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="from" className="text-xs">From</Label>
              <Input
                id="from"
                type="date"
                className="h-8 w-36"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to" className="text-xs">To</Label>
              <Input
                id="to"
                type="date"
                className="h-8 w-36"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-8 w-48">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleFilter} disabled={isPending}>
              <Filter className="mr-1 h-3.5 w-3.5" />
              {isPending ? "Loading..." : "Filter"}
            </Button>
            {(fromDate || toDate || clientId !== "all" || statusFilter !== "all") && (
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={isPending}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        <StatusCard
          label="All"
          count={totalActive}
          active={statusFilter === "all"}
          onClick={() => handleStatusClick("all")}
        />
        <StatusCard
          label="Registered"
          count={sampleStatus.registered}
          color="bg-blue-500"
          active={statusFilter === "registered"}
          onClick={() => handleStatusClick("registered")}
        />
        <StatusCard
          label="Assigned"
          count={sampleStatus.assigned}
          color="bg-yellow-500"
          active={statusFilter === "assigned"}
          onClick={() => handleStatusClick("assigned")}
        />
        <StatusCard
          label="Testing"
          count={sampleStatus.testing}
          color="bg-orange-500"
          active={statusFilter === "testing"}
          onClick={() => handleStatusClick("testing")}
        />
        <StatusCard
          label="Completed"
          count={sampleStatus.completed}
          color="bg-green-500"
          active={statusFilter === "completed"}
          onClick={() => handleStatusClick("completed")}
        />
        <StatusCard
          label="Reported"
          count={sampleStatus.reported}
          color="bg-purple-500"
          active={statusFilter === "reported"}
          onClick={() => handleStatusClick("reported")}
        />
      </div>

      {/* Samples Table */}
      <DataTable
        columns={columns}
        data={data.samples}
        searchPlaceholder="Search by sample number, customer, reference..."
        searchKey="sampleNumber"
      />
    </div>
  )
}

function StatusCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  color?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2">
        {color && <div className={`h-2.5 w-2.5 rounded-full ${color}`} />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-bold">{count}</span>
    </button>
  )
}
