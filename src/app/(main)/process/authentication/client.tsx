"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Send,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  submitReport,
  approveReport,
  requestRevision,
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
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending</Badge>
    case "review":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Under Review</Badge>
    case "revision":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Revision Required</Badge>
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

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Pending" },
  { value: "review", label: "Under Review" },
  { value: "revision", label: "Revision Required" },
]

export function AuthenticationClient({ reports }: { reports: Report[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")

  // Dialog states
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [viewResultsOpen, setViewResultsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected report for actions
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [revisionReason, setRevisionReason] = useState("")

  const filteredReports = useMemo(() => {
    if (statusFilter === "all") return reports
    return reports.filter((r) => r.status === statusFilter)
  }, [reports, statusFilter])

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
        title="Authentication"
        description="Review and authenticate completed test results"
      />

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filteredReports}
        searchPlaceholder="Search by report number..."
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
