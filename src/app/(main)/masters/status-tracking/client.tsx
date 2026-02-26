"use client"

import { useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import {
  FlaskConical,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Filter,
  RotateCcw,
  TestTube,
} from "lucide-react"
import { getStatusTrackingData } from "@/actions/status-tracking"

type StatusData = Awaited<ReturnType<typeof getStatusTrackingData>>

export function StatusTrackingClient({ initialData }: { initialData: StatusData }) {
  const [data, setData] = useState(initialData)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleFilter() {
    startTransition(async () => {
      const result = await getStatusTrackingData({
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setData(result)
    })
  }

  function handleReset() {
    setFromDate("")
    setToDate("")
    startTransition(async () => {
      const result = await getStatusTrackingData()
      setData(result)
    })
  }

  const pendingSampleColumns: ColumnDef<StatusData["pendingSamples"][0]>[] = [
    { accessorKey: "sampleNumber", header: "Sample #" },
    { accessorKey: "client", header: "Client" },
    { accessorKey: "sampleType", header: "Type" },
    { accessorKey: "assignedTo", header: "Assigned To" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge variant={s === "registered" ? "outline" : s === "testing" ? "default" : "secondary"}>
            {s}
          </Badge>
        )
      },
    },
    { accessorKey: "testCount", header: "Tests" },
    {
      accessorKey: "registeredAt",
      header: "Registered",
      cell: ({ row }) => new Date(row.original.registeredAt).toLocaleDateString(),
    },
  ]

  const overdueColumns: ColumnDef<StatusData["overdueTests"][0]>[] = [
    { accessorKey: "sampleNumber", header: "Sample #" },
    { accessorKey: "parameter", header: "Parameter" },
    { accessorKey: "client", header: "Client" },
    { accessorKey: "sampleType", header: "Type" },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        if (!row.original.dueDate) return "-"
        const due = new Date(row.original.dueDate)
        const daysOverdue = Math.ceil((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24))
        return (
          <span className="text-destructive font-medium">
            {due.toLocaleDateString()} ({daysOverdue}d overdue)
          </span>
        )
      },
    },
  ]

  const { pipeline, sampleStatus, reportStatus, accountsStatus } = data

  return (
    <div className="space-y-4">
      <PageHeader
        title="Status Tracking"
        description="Track pending items across all workflow stages"
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
            <Button size="sm" onClick={handleFilter} disabled={isPending}>
              <Filter className="mr-1 h-3.5 w-3.5" />
              {isPending ? "Loading..." : "Filter"}
            </Button>
            {(fromDate || toDate) && (
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={isPending}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Summary */}
      <div className="flex flex-wrap gap-2">
        <PipelineBadge icon={TestTube} label="Testing" count={pipeline.testingPending} color="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" />
        <PipelineBadge icon={ShieldCheck} label="Authentication" count={pipeline.authenticationPending} color="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" />
        <PipelineBadge icon={FlaskConical} label="Revision" count={pipeline.revisionPending} color="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" />
        <PipelineBadge icon={Receipt} label="Invoice" count={pipeline.invoicePending} color="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" />
        <PipelineBadge icon={Receipt} label="Receipt" count={pipeline.receiptPending} color="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" />
        <PipelineBadge icon={AlertTriangle} label="Overdue" count={pipeline.overdueTests} color="bg-destructive/10 text-destructive" />
        {pipeline.outstandingAmount > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium bg-destructive/5 text-destructive">
            Outstanding: AED {pipeline.outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="samples" className="space-y-3">
        <TabsList>
          <TabsTrigger value="samples">
            Samples
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {sampleStatus.registered + sampleStatus.assigned + sampleStatus.testing}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="workflow">
            Workflow
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {reportStatus.draft + reportStatus.review + reportStatus.revision}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="accounts">
            Accounts
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {accountsStatus.draft + accountsStatus.sent + accountsStatus.overdue}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {data.overdueTests.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {data.overdueTests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Samples Tab */}
        <TabsContent value="samples" className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <MiniStat label="Registered" count={sampleStatus.registered} />
            <MiniStat label="Assigned" count={sampleStatus.assigned} />
            <MiniStat label="Testing" count={sampleStatus.testing} />
            <MiniStat label="Completed" count={sampleStatus.completed} />
            <MiniStat label="Reported" count={sampleStatus.reported} />
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Pending Samples</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DataTable
                columns={pendingSampleColumns}
                data={data.pendingSamples}
                searchPlaceholder="Search by sample number, client..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <MiniStat label="Auth Pending" count={reportStatus.draft} />
            <MiniStat label="Under Review" count={reportStatus.review} />
            <MiniStat label="Revision" count={reportStatus.revision} />
            <MiniStat label="Authenticated" count={reportStatus.approved} />
            <MiniStat label="Published" count={reportStatus.published} />
          </div>

          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-3 divide-x">
                <div className="px-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Testing Pipeline</p>
                  <StatRow label="Awaiting assignment" count={sampleStatus.registered} />
                  <StatRow label="Assigned / in progress" count={sampleStatus.assigned + sampleStatus.testing} />
                  <StatRow label="Results completed" count={sampleStatus.completed} />
                </div>
                <div className="px-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Pipeline</p>
                  <StatRow label="Awaiting authentication" count={reportStatus.draft} />
                  <StatRow label="Under review" count={reportStatus.review} />
                  <StatRow label="Revision required" count={reportStatus.revision} />
                </div>
                <div className="px-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post-Approval</p>
                  <StatRow label="Authenticated" count={reportStatus.approved} />
                  <StatRow label="Published" count={reportStatus.published} />
                  <StatRow label="Pending invoicing" count={accountsStatus.draft} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <MiniStat label="Draft" count={accountsStatus.draft} />
            <MiniStat label="Sent" count={accountsStatus.sent} />
            <MiniStat label="Overdue" count={accountsStatus.overdue} />
            <MiniStat label="Paid" count={accountsStatus.paid} />
          </div>

          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 divide-x">
                <div className="px-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoices</p>
                  <StatRow label="Draft invoices" count={accountsStatus.draft} />
                  <StatRow label="Sent / awaiting payment" count={accountsStatus.sent} />
                  <StatRow label="Overdue" count={accountsStatus.overdue} />
                  <StatRow label="Fully paid" count={accountsStatus.paid} />
                </div>
                <div className="px-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outstanding</p>
                  <div className="pt-1">
                    <p className="text-2xl font-bold text-destructive">
                      AED {pipeline.outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total unpaid amount</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Tab */}
        <TabsContent value="overdue" className="space-y-3">
          {data.overdueTests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No overdue test results found.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Overdue Test Results ({data.overdueTests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  columns={overdueColumns}
                  data={data.overdueTests}
                  searchPlaceholder="Search overdue tests..."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PipelineBadge({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: any
  label: string
  count: number
  color: string
}) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}:</span>
      <span className="font-bold">{count}</span>
    </div>
  )
}

function MiniStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  )
}

function StatRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold text-sm">{count}</span>
    </div>
  )
}
