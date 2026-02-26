"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Send,
  ShieldCheck,
  RotateCcw,
  Globe,
  FileText,
  Loader2,
  Printer,
  Eye,
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
  submitReport,
  approveReport,
  requestRevision,
  publishReport,
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
    testResults: TestResultInfo[]
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
            {/* View Results — available for draft and review */}
            {(report.status === "draft" || report.status === "review") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleOpenViewResults(report)}
                title="View Results"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {/* Draft → Submit for authentication */}
            {report.status === "draft" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleSubmit(report)}
                  title="Submit for Authentication"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                  onClick={() => handleOpenRevision(report)}
                  title="Revert to Chemist"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
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
                  onClick={() => handleOpenRevision(report)}
                  title="Revert to Chemist"
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
    <div className="space-y-4">
      <PageHeader
        title="Reports & Authentication"
        description="View reports, authenticate completed test results, and publish COA certificates"
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
                      <TableHead className="text-xs">Status</TableHead>
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
                          <TableCell className="py-1.5">
                            {tr.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Done</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                            )}
                          </TableCell>
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
            {selectedReport && (selectedReport.status === "draft" || selectedReport.status === "review") && (
              <>
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
                {selectedReport.status === "draft" && (
                  <Button onClick={() => {
                    setViewResultsOpen(false)
                    handleSubmit(selectedReport)
                  }}>
                    <Send className="mr-1 h-4 w-4" />
                    Submit for Auth
                  </Button>
                )}
                {selectedReport.status === "review" && (
                  <Button onClick={() => {
                    setViewResultsOpen(false)
                    handleAuthenticate(selectedReport)
                  }}>
                    <ShieldCheck className="mr-1 h-4 w-4" />
                    Authenticate
                  </Button>
                )}
              </>
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

    </div>
  )
}
