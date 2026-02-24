"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Send,
  CheckCircle,
  Globe,
  Trash2,
  FileText,
  Loader2,
  FileCheck,
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
  publishReport,
  deleteReport,
  getCompletedSamplesForSelect,
  getReportTemplatesForSelect,
  updateReportTemplate as updateReportTemplateAction,
} from "@/actions/reports"

type Report = {
  id: string
  reportNumber: string
  title: string | null
  summary: string | null
  status: string
  createdAt: string
  sample: {
    id: string
    sampleNumber: string
    client: { id: string; name: string; company: string | null }
    sampleType: { id: string; name: string }
  }
  createdBy: { name: string }
  reviewedBy: { name: string } | null
}

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "review":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Review</Badge>
    case "approved":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approved</Badge>
    case "published":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function ReportsClient({ reports }: { reports: Report[] }) {
  const router = useRouter()

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected report for actions
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

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
      toast.success(`Report ${report.reportNumber} submitted for review`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report")
    }
  }

  const handleApprove = async (report: Report) => {
    try {
      await approveReport(report.id)
      toast.success(`Report ${report.reportNumber} approved`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to approve report")
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
      header: "Type",
      cell: ({ row }) => row.original.sample.sampleType.name,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => row.original.title || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: "createdBy.name",
      header: "Created By",
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
            {report.status === "draft" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleSubmit(report)}
                title="Submit for Review"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            {report.status === "review" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleApprove(report)}
                title="Approve"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
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
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Create and manage laboratory reports"
        actionLabel="Create Report"
        onAction={handleOpenCreate}
      />

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
              <Label>Summary</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Report summary..."
                rows={4}
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
