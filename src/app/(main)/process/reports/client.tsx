"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Send,
  ShieldCheck,
  RotateCcw,
  Globe,
  Trash2,
  FileText,
  Loader2,
  Printer,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  createReport,
  submitReport,
  approveReport,
  requestRevision,
  publishReport,
  deleteReport,
  getCompletedSamplesForSelect,
  getReportTemplatesForSelect,
} from "@/actions/reports"

type Report = {
  id: string
  reportNumber: string
  title: string | null
  summary: string | null
  status: string
  createdAt: string
  reviewedAt: string | null
  sample: {
    id: string
    sampleNumber: string
    client: { id: string; name: string; company: string | null }
    sampleType: { id: string; name: string }
    assignedTo: { id: string; name: string } | null
    testResults: { enteredById: string | null; enteredBy: { id: string; name: string } | null }[]
  }
  createdBy: { id: string; name: string }
  reviewedBy: { id: string; name: string } | null
}

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Authentication Pending</Badge>
    case "review":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Under Review</Badge>
    case "revision":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Revision Required</Badge>
    case "approved":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Authenticated</Badge>
    case "published":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Published</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getChemistName(report: Report): string {
  // First check test results for who entered them
  const enteredBy = report.sample.testResults?.[0]?.enteredBy
  if (enteredBy) return enteredBy.name
  // Fallback to assigned chemist
  if (report.sample.assignedTo) return report.sample.assignedTo.name
  return "-"
}

export function ReportsClient({ reports }: { reports: Report[] }) {
  const router = useRouter()

  // Selection for batch print
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected report for actions
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [revisionReason, setRevisionReason] = useState("")

  const printableReports = useMemo(
    () => reports.filter((r) => r.status === "approved" || r.status === "published"),
    [reports]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllPrintable = () => {
    if (selectedIds.size === printableReports.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(printableReports.map((r) => r.id)))
    }
  }

  const handleBatchPrint = () => {
    const printableIds = Array.from(selectedIds).filter((id) =>
      printableReports.some((r) => r.id === id)
    )
    if (printableIds.length === 0) {
      toast.error("No authenticated/published reports selected")
      return
    }
    window.open(`/api/reports/batch-coa?ids=${printableIds.join(",")}`, "_blank")
  }

  // Create form
  const [sampleId, setSampleId] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [completedSamples, setCompletedSamples] = useState<
    { value: string; label: string }[]
  >([])
  const [templates, setTemplates] = useState<
    { value: string; label: string }[]
  >([])

  const handleOpenCreate = async () => {
    try {
      const [samples, tpls] = await Promise.all([
        getCompletedSamplesForSelect(),
        getReportTemplatesForSelect(),
      ])
      setCompletedSamples(
        samples.map((s) => ({
          value: s.id,
          label: `${s.sampleNumber} - ${s.clientName} - ${s.typeName}`,
        }))
      )
      setTemplates(
        tpls.map((t) => ({
          value: t.id,
          label: t.isDefault ? `${t.name} (Default)` : t.name,
        }))
      )
      const defaultTpl = tpls.find((t) => t.isDefault)
      setSampleId("")
      setTitle("")
      setSummary("")
      setTemplateId(defaultTpl?.id || "")
      setCreateOpen(true)
    } catch {
      toast.error("Failed to load data")
    }
  }

  const handleCreate = async () => {
    if (!sampleId || !title.trim()) {
      toast.error("Please select a sample and enter a title")
      return
    }

    setLoading(true)
    try {
      const report = await createReport({
        sampleId,
        title: title.trim(),
        summary: summary.trim() || undefined,
        templateId: templateId || undefined,
      })
      toast.success(`Report ${report.reportNumber} created successfully`)
      setCreateOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create report")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (report: Report) => {
    try {
      await submitReport(report.id)
      toast.success(`Report ${report.reportNumber} submitted for authentication`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report")
    }
  }

  const handleAuthenticate = async (report: Report) => {
    try {
      await approveReport(report.id)
      toast.success(`Report ${report.reportNumber} authenticated`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to authenticate report")
    }
  }

  const handleRevision = async () => {
    if (!selectedReport || !revisionReason.trim()) {
      toast.error("Please provide a reason for revision")
      return
    }

    setLoading(true)
    try {
      await requestRevision(selectedReport.id, revisionReason.trim())
      toast.success(`Revision requested for ${selectedReport.reportNumber}`)
      setRevisionOpen(false)
      setRevisionReason("")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to request revision")
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (report: Report) => {
    try {
      await publishReport(report.id)
      toast.success(`Report ${report.reportNumber} published`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to publish report")
    }
  }

  const handleDelete = async () => {
    if (!selectedReport) return

    setLoading(true)
    try {
      await deleteReport(selectedReport.id)
      toast.success(`Report ${selectedReport.reportNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete report")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Report, any>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={printableReports.length > 0 && selectedIds.size === printableReports.length}
          onCheckedChange={toggleSelectAllPrintable}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => {
        const isPrintable = row.original.status === "approved" || row.original.status === "published"
        if (!isPrintable) return null
        return (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            className="h-4 w-4"
          />
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "reportNumber",
      header: "Report #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.reportNumber}</span>
      ),
    },
    {
      accessorKey: "sample.sampleNumber",
      header: "Sample #",
      cell: ({ row }) => row.original.sample.sampleNumber,
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.sample.client.company ||
        row.original.sample.client.name,
    },
    {
      id: "type",
      header: "Sample Type",
      cell: ({ row }) => row.original.sample.sampleType.name,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: "chemist",
      header: "Tested By",
      cell: ({ row }) => (
        <span className="text-sm">{getChemistName(row.original)}</span>
      ),
    },
    {
      id: "authenticatedBy",
      header: "Authenticated By",
      cell: ({ row }) => {
        const r = row.original
        if (r.status === "approved" || r.status === "published") {
          return (
            <span className="text-sm font-medium text-green-700">
              {r.reviewedBy?.name || "-"}
            </span>
          )
        }
        return <span className="text-sm text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const report = row.original
        return (
          <div className="flex items-center gap-1">
            {/* Draft → Submit for authentication */}
            {report.status === "draft" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleSubmit(report)}
                title="Submit for Authentication"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}

            {/* Under Review → Authenticate or Request Revision */}
            {report.status === "review" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  onClick={() => handleAuthenticate(report)}
                  title="Authenticate"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                  onClick={() => {
                    setSelectedReport(report)
                    setRevisionReason("")
                    setRevisionOpen(true)
                  }}
                  title="Request Revision"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Authenticated → Publish */}
            {report.status === "approved" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handlePublish(report)}
                title="Publish"
              >
                <Globe className="h-4 w-4" />
              </Button>
            )}

            {/* View COA PDF (approved or published) */}
            {(report.status === "approved" || report.status === "published") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => window.open(`/api/reports/${report.id}/coa`, "_blank")}
                title="View COA"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}

            {/* Delete only drafts */}
            {report.status === "draft" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  setSelectedReport(report)
                  setDeleteOpen(true)
                }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {/* Revision: show the reason */}
            {report.status === "revision" && report.summary && (
              <span className="text-xs text-red-600 max-w-[150px] truncate" title={report.summary}>
                {report.summary}
              </span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Authentication"
        description="View reports, authenticate completed test results, and publish COA certificates"
        actionLabel="Create Report"
        onAction={handleOpenCreate}
      />

      {/* Batch actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBatchPrint}
          >
            <Printer className="mr-1 h-3 w-3" />
            Print COA ({selectedIds.size})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={reports}
        searchPlaceholder="Search reports..."
        searchKey="reportNumber"
      />

      {/* Create Report Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              Create a new report for a completed sample.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Sample *</Label>
              <SearchableSelect
                options={completedSamples}
                value={sampleId}
                onValueChange={setSampleId}
                placeholder="Select a completed sample..."
                searchPlaceholder="Search samples..."
                emptyMessage="No completed samples available."
              />
            </div>
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Report title..."
              />
            </div>
            {templates.length > 0 && (
              <div className="grid gap-2">
                <Label>Report Template</Label>
                <SearchableSelect
                  options={templates}
                  value={templateId}
                  onValueChange={setTemplateId}
                  placeholder="Select template..."
                  searchPlaceholder="Search templates..."
                  emptyMessage="No templates available."
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Report remarks..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Send report {selectedReport?.reportNumber} back to the chemist for corrections.
              The test results will be reset to pending status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Reason for Revision *</Label>
              <Textarea
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Flash point value seems incorrect, please re-test..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevisionOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevision}
              disabled={loading || !revisionReason.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send for Revision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Report"
        description={`Are you sure you want to delete report ${selectedReport?.reportNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
