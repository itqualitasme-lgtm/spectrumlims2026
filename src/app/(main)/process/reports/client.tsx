"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  RotateCcw,
  Globe,
  FileText,
  Loader2,
  Printer,
  Eye,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  requestRevision,
  publishReport,
  deleteReport,
} from "@/actions/reports"

type TestResultInfo = {
  id: string
  parameter: string
  testMethod: string | null
  unit: string | null
  resultValue: string | null
  specMin: string | null
  specMax: string | null
  status: string
  enteredById: string | null
  enteredBy: { id: string; name: string } | null
}

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
    registration: { id: string; registrationNumber: string } | null
    testResults: TestResultInfo[]
  }
  createdBy: { id: string; name: string }
  reviewedBy: { id: string; name: string } | null
}

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Authenticated</Badge>
    case "published":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Published</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getPassFail(
  value: string | null,
  specMin: string | null,
  specMax: string | null
): "pass" | "fail" | null {
  if (!value?.trim()) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const min = specMin ? parseFloat(specMin) : null
  const max = specMax ? parseFloat(specMax) : null
  if (min === null && max === null) return null
  if (min !== null && !isNaN(min) && num < min) return "fail"
  if (max !== null && !isNaN(max) && num > max) return "fail"
  return "pass"
}

function getChemistName(report: Report): string {
  const enteredBy = report.sample.testResults?.find((tr) => tr.enteredBy)?.enteredBy
  if (enteredBy) return enteredBy.name
  if (report.sample.assignedTo) return report.sample.assignedTo.name
  return "-"
}

export function ReportsClient({ reports }: { reports: Report[] }) {
  const router = useRouter()

  // Selection for batch print
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [viewResultsOpen, setViewResultsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected report for actions
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [revisionReason, setRevisionReason] = useState("")

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reports.map((r) => r.id)))
    }
  }

  const handleBatchPrint = () => {
    if (selectedIds.size === 0) {
      toast.error("No reports selected")
      return
    }
    window.open(`/api/reports/batch-coa?ids=${Array.from(selectedIds).join(",")}`, "_blank")
  }

  // Check if selected reports all belong to one registration
  const selectedRegistrationId = useMemo(() => {
    if (selectedIds.size === 0) return null
    const selectedReports = reports.filter((r) => selectedIds.has(r.id))
    const regIds = new Set(selectedReports.map((r) => r.sample.registration?.id).filter(Boolean))
    return regIds.size === 1 ? Array.from(regIds)[0] : null
  }, [selectedIds, reports])

  const handlePrintRegistrationCOA = (registrationId: string) => {
    window.open(`/api/reports/batch-coa?registrationId=${registrationId}`, "_blank")
  }

  const handleOpenViewResults = (report: Report) => {
    setSelectedReport(report)
    setViewResultsOpen(true)
  }

  const handleOpenRevision = (report: Report) => {
    setSelectedReport(report)
    setRevisionReason("")
    setRevisionOpen(true)
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

  const handleDeleteReport = async (report: Report) => {
    if (!confirm(`Delete report ${report.reportNumber}? This action cannot be undone.`)) return
    try {
      await deleteReport(report.id)
      toast.success(`Deleted report ${report.reportNumber}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete report")
    }
  }

  const columns: ColumnDef<Report, any>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={reports.length > 0 && selectedIds.size === reports.length}
          onCheckedChange={toggleSelectAll}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          className="h-4 w-4"
        />
      ),
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
      cell: ({ row }) => (
        <span className="text-sm font-medium text-green-700">
          {row.original.reviewedBy?.name || "-"}
        </span>
      ),
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
            {/* View Results */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleOpenViewResults(report)}
              title="View Results"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* View COA PDF */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => window.open(`/api/reports/${report.id}/coa`, "_blank")}
              title="View COA"
            >
              <FileText className="h-4 w-4" />
            </Button>

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

            {/* Revert — available for both approved and published */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
              onClick={() => handleOpenRevision(report)}
              title="Revert to Chemist"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => handleDeleteReport(report)}
              title="Delete Report"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="View, download, and search authenticated reports"
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
          {selectedRegistrationId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePrintRegistrationCOA(selectedRegistrationId)}
            >
              <FileText className="mr-1 h-3 w-3" />
              Print Registration COA
            </Button>
          )}
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
        searchPlaceholder="Search by report number, sample, client..."
      />

      {/* View Results Dialog */}
      <Dialog open={viewResultsOpen} onOpenChange={setViewResultsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Test Results — {selectedReport?.sample.sampleNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.sample.client.company || selectedReport?.sample.client.name} — {selectedReport?.sample.sampleType.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {selectedReport && selectedReport.sample.testResults.length > 0 ? (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[28px]">#</TableHead>
                      <TableHead className="text-xs">Parameter</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Result</TableHead>
                      <TableHead className="text-xs">Spec Min</TableHead>
                      <TableHead className="text-xs">Spec Max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReport.sample.testResults.map((tr, idx) => {
                      const passFail = getPassFail(tr.resultValue, tr.specMin, tr.specMax)
                      return (
                        <TableRow key={tr.id}>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-medium py-1.5">{tr.parameter}</TableCell>
                          <TableCell className="text-xs py-1.5">{tr.testMethod || "-"}</TableCell>
                          <TableCell className="text-xs py-1.5">{tr.unit || "-"}</TableCell>
                          <TableCell className="py-1.5">
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-medium ${
                                passFail === "fail" ? "text-red-600" :
                                passFail === "pass" ? "text-green-600" : ""
                              }`}>
                                {tr.resultValue || "-"}
                              </span>
                              {passFail === "pass" && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[9px] px-1 py-0">P</Badge>
                              )}
                              {passFail === "fail" && (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-[9px] px-1 py-0">F</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-1.5">{tr.specMin || "-"}</TableCell>
                          <TableCell className="text-xs py-1.5">{tr.specMax || "-"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No test results found for this sample.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewResultsOpen(false)}>
              Close
            </Button>
            {selectedReport && (
              <Button
                variant="destructive"
                onClick={() => {
                  setViewResultsOpen(false)
                  handleOpenRevision(selectedReport)
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Revert to Chemist
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Revert to Chemist</DialogTitle>
            <DialogDescription>
              Send report {selectedReport?.reportNumber} back to the chemist for corrections.
              The test results will be reset to pending status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Remarks / Reason for Revert *</Label>
              <Textarea
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Client requested re-testing, flash point value needs correction..."
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
    </div>
  )
}
