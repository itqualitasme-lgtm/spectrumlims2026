"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, ChevronDown, ChevronUp, Plus, Trash2, FlaskConical } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
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
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { batchUpdateTestResults, addTestsToSample, deleteTestResult } from "@/actions/test-results"

type TestResult = {
  id: string
  parameter: string
  testMethod: string | null
  unit: string | null
  resultValue: string | null
  specMin: string | null
  specMax: string | null
  tat: number | null
  dueDate: string | null
  status: string
  enteredBy: { name: string } | null
}

type Sample = {
  id: string
  sampleNumber: string
  status: string
  samplePoint: string | null
  description: string | null
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
  testResults: TestResult[]
}

function getPassFail(
  value: string,
  specMin: string | null,
  specMax: string | null
): "pass" | "fail" | null {
  if (!value.trim()) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const min = specMin ? parseFloat(specMin) : null
  const max = specMax ? parseFloat(specMax) : null
  if (min === null && max === null) return null
  if (min !== null && !isNaN(min) && num < min) return "fail"
  if (max !== null && !isNaN(max) && num > max) return "fail"
  return "pass"
}

function isDueSoon(dueDate: string | null): "overdue" | "due-today" | "due-soon" | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return "overdue"
  if (diffDays < 1) return "due-today"
  if (diffDays < 2) return "due-soon"
  return null
}

const sampleStatusBadge = (status: string) => {
  switch (status) {
    case "registered":
      return <Badge variant="outline" className="text-[10px]">Registered</Badge>
    case "assigned":
      return <Badge variant="default" className="text-[10px]">Assigned</Badge>
    case "testing":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]">Testing</Badge>
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Completed</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px]">{status}</Badge>
  }
}

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
  { value: "registered", label: "Registered" },
]

export function TestResultsClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set())
  const [resultValues, setResultValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {}
    samples.forEach((s) => {
      s.testResults.forEach((tr) => {
        values[tr.id] = tr.resultValue || ""
      })
    })
    return values
  })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState("all")

  // Add test dialog
  const [addTestOpen, setAddTestOpen] = useState(false)
  const [addTestSampleId, setAddTestSampleId] = useState("")
  const [addTestSampleNumber, setAddTestSampleNumber] = useState("")
  const [newParam, setNewParam] = useState("")
  const [newMethod, setNewMethod] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newSpecMin, setNewSpecMin] = useState("")
  const [newSpecMax, setNewSpecMax] = useState("")
  const [newTat, setNewTat] = useState("")
  const [addTestLoading, setAddTestLoading] = useState(false)

  const filteredSamples = useMemo(() => {
    if (statusFilter === "all") return samples
    return samples.filter((s) => s.status === statusFilter)
  }, [samples, statusFilter])

  const toggleExpand = (sampleId: string) => {
    setExpandedSamples((prev) => {
      const next = new Set(prev)
      if (next.has(sampleId)) next.delete(sampleId)
      else next.add(sampleId)
      return next
    })
  }

  const expandAll = () => {
    setExpandedSamples(new Set(filteredSamples.map((s) => s.id)))
  }

  const collapseAll = () => {
    setExpandedSamples(new Set())
  }

  const handleResultChange = (testResultId: string, value: string) => {
    setResultValues((prev) => ({ ...prev, [testResultId]: value }))
  }

  const handleSaveSample = async (sample: Sample) => {
    const results = sample.testResults
      .filter((tr) => resultValues[tr.id]?.trim())
      .map((tr) => ({
        id: tr.id,
        resultValue: resultValues[tr.id].trim(),
      }))

    if (results.length === 0) {
      toast.error("Please enter at least one result value")
      return
    }

    setSavingIds((prev) => new Set(prev).add(sample.id))
    try {
      await batchUpdateTestResults(sample.id, results)
      toast.success(
        `Saved ${results.length} result(s) for ${sample.sampleNumber}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save results")
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(sample.id)
        return next
      })
    }
  }

  const handleOpenAddTest = (sample: Sample) => {
    setAddTestSampleId(sample.id)
    setAddTestSampleNumber(sample.sampleNumber)
    setNewParam("")
    setNewMethod("")
    setNewUnit("")
    setNewSpecMin("")
    setNewSpecMax("")
    setNewTat("")
    setAddTestOpen(true)
  }

  const handleAddTest = async () => {
    if (!addTestSampleId || !newParam.trim()) {
      toast.error("Parameter name is required")
      return
    }

    setAddTestLoading(true)
    try {
      await addTestsToSample(addTestSampleId, [{
        parameter: newParam.trim(),
        testMethod: newMethod.trim() || undefined,
        unit: newUnit.trim() || undefined,
        specMin: newSpecMin.trim() || undefined,
        specMax: newSpecMax.trim() || undefined,
        tat: newTat ? parseInt(newTat) : undefined,
      }])
      toast.success(`Added parameter "${newParam.trim()}" to ${addTestSampleNumber}`)
      setAddTestOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to add test parameter")
    } finally {
      setAddTestLoading(false)
    }
  }

  const handleDeleteTest = async (testResultId: string, paramName: string) => {
    if (!confirm(`Delete pending parameter "${paramName}"?`)) return

    try {
      await deleteTestResult(testResultId)
      toast.success(`Deleted parameter "${paramName}"`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete test parameter")
    }
  }

  // Stats
  const totalSamples = samples.length
  const pendingCount = samples.filter((s) => s.status === "assigned" || s.status === "registered").length
  const testingCount = samples.filter((s) => s.status === "testing").length
  const doneCount = samples.filter((s) => s.status === "completed").length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Test Results"
        description="Enter test results and manage sample testing"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter("all")}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Total Samples</p>
            <p className="text-2xl font-bold">{totalSamples}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter("assigned")}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Pending Entry</p>
            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter("testing")}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{testingCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter("completed")}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600">{doneCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {filteredSamples.length} sample{filteredSamples.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Grouped Sample Cards */}
      {filteredSamples.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No samples found
            </p>
            <p className="text-xs text-muted-foreground">
              Samples assigned to you will appear here for test result entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSamples.map((sample) => {
            const isExpanded = expandedSamples.has(sample.id)
            const completed = sample.testResults.filter((tr) => tr.status === "completed").length
            const total = sample.testResults.length
            const isSaving = savingIds.has(sample.id)
            const hasEnteredValues = sample.testResults.some((tr) => resultValues[tr.id]?.trim())

            return (
              <Card key={sample.id} className={isExpanded ? "border-primary/30" : ""}>
                {/* Sample Header - clickable to expand/collapse */}
                <button
                  onClick={() => toggleExpand(sample.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{sample.sampleNumber}</span>
                      {sampleStatusBadge(sample.status)}
                      <span className="text-xs text-muted-foreground">
                        {sample.sampleType.name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{sample.client.company || sample.client.name}</span>
                      {sample.description && <span>| {sample.description}</span>}
                      {sample.samplePoint && <span>| {sample.samplePoint}</span>}
                      {sample.assignedTo && <span>| {sample.assignedTo.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Progress */}
                    {total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              completed === total ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${(completed / total) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          completed === total ? "text-green-600" : "text-muted-foreground"
                        }`}>
                          {completed}/{total}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded: Test Results Table */}
                {isExpanded && (
                  <CardContent className="px-4 pt-0 pb-3 border-t">
                    {sample.testResults.length > 0 ? (
                      <>
                        <div className="rounded-md border mt-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs w-[30px]">#</TableHead>
                                <TableHead className="text-xs">Parameter</TableHead>
                                <TableHead className="text-xs">Method</TableHead>
                                <TableHead className="text-xs">Unit</TableHead>
                                <TableHead className="text-xs w-[160px]">Result</TableHead>
                                <TableHead className="text-xs">Spec Min</TableHead>
                                <TableHead className="text-xs">Spec Max</TableHead>
                                <TableHead className="text-xs">Due</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs w-[28px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sample.testResults.map((tr, idx) => {
                                const currentValue = resultValues[tr.id] || ""
                                const passFail = getPassFail(currentValue, tr.specMin, tr.specMax)
                                const dueStatus = isDueSoon(tr.dueDate)

                                return (
                                  <TableRow key={tr.id}>
                                    <TableCell className="text-xs text-muted-foreground py-1.5">
                                      {idx + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs py-1.5">
                                      {tr.parameter}
                                    </TableCell>
                                    <TableCell className="text-xs py-1.5">{tr.testMethod || "-"}</TableCell>
                                    <TableCell className="text-xs py-1.5">{tr.unit || "-"}</TableCell>
                                    <TableCell className="py-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <Input
                                          value={currentValue}
                                          onChange={(e) =>
                                            handleResultChange(tr.id, e.target.value)
                                          }
                                          placeholder="Enter result..."
                                          className={`h-7 text-xs ${
                                            passFail === "fail"
                                              ? "border-red-400 focus-visible:ring-red-400"
                                              : passFail === "pass"
                                                ? "border-green-400 focus-visible:ring-green-400"
                                                : ""
                                          }`}
                                        />
                                        {passFail === "pass" && (
                                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0 text-[9px] px-1">P</Badge>
                                        )}
                                        {passFail === "fail" && (
                                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 shrink-0 text-[9px] px-1">F</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs py-1.5">{tr.specMin || "-"}</TableCell>
                                    <TableCell className="text-xs py-1.5">{tr.specMax || "-"}</TableCell>
                                    <TableCell className="text-xs py-1.5">
                                      {tr.dueDate ? (
                                        <span className={
                                          dueStatus === "overdue" ? "text-red-600 font-medium" :
                                          dueStatus === "due-today" ? "text-orange-600 font-medium" :
                                          dueStatus === "due-soon" ? "text-yellow-600" : ""
                                        }>
                                          {new Date(tr.dueDate).toLocaleDateString()}
                                          {dueStatus === "overdue" && " !"}
                                        </span>
                                      ) : "-"}
                                    </TableCell>
                                    <TableCell className="py-1.5">
                                      {tr.status === "pending" ? (
                                        <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                                      ) : (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Done</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1.5">
                                      {tr.status === "pending" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                          onClick={() => handleDeleteTest(tr.id, tr.parameter)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                        {/* Action buttons per sample */}
                        <div className="flex items-center justify-between mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleOpenAddTest(sample)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Test
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSaveSample(sample)}
                            disabled={isSaving || !hasEnteredValues}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-1 h-3 w-3" />
                                Save Results
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <FlaskConical className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground mb-3">
                          No test parameters defined for this sample.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleOpenAddTest(sample)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Test Parameter
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Test Parameter</DialogTitle>
            <DialogDescription>
              Add a new test parameter to {addTestSampleNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Parameter Name *</Label>
                <Input
                  value={newParam}
                  onChange={(e) => setNewParam(e.target.value)}
                  placeholder="e.g. Viscosity"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Test Method</Label>
                <Input
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  placeholder="e.g. ASTM D445"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Unit</Label>
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="cSt"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Spec Min</Label>
                <Input
                  value={newSpecMin}
                  onChange={(e) => setNewSpecMin(e.target.value)}
                  placeholder="min"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Spec Max</Label>
                <Input
                  value={newSpecMax}
                  onChange={(e) => setNewSpecMax(e.target.value)}
                  placeholder="max"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">TAT (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={newTat}
                  onChange={(e) => setNewTat(e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTestOpen(false)} disabled={addTestLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddTest} disabled={addTestLoading}>
              {addTestLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Parameter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
