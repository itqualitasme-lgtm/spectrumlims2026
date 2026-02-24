"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Save, ChevronRight, Plus, Trash2, FlaskConical } from "lucide-react"
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
  CardDescription,
  CardHeader,
  CardTitle,
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

const statusBadge = (status: string) => {
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
  const [selectedSampleId, setSelectedSampleId] = useState("")
  const [resultValues, setResultValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  // Add test dialog
  const [addTestOpen, setAddTestOpen] = useState(false)
  const [newParam, setNewParam] = useState("")
  const [newMethod, setNewMethod] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newSpecMin, setNewSpecMin] = useState("")
  const [newSpecMax, setNewSpecMax] = useState("")
  const [newTat, setNewTat] = useState("")

  const filteredSamples = useMemo(() => {
    if (statusFilter === "all") return samples
    return samples.filter((s) => s.status === statusFilter)
  }, [samples, statusFilter])

  const selectedSample = samples.find((s) => s.id === selectedSampleId)

  const handleSampleSelect = (sampleId: string) => {
    setSelectedSampleId(sampleId)
    const sample = samples.find((s) => s.id === sampleId)
    if (sample) {
      const values: Record<string, string> = {}
      sample.testResults.forEach((tr) => {
        values[tr.id] = tr.resultValue || ""
      })
      setResultValues(values)
    }
  }

  const handleResultChange = (testResultId: string, value: string) => {
    setResultValues((prev) => ({ ...prev, [testResultId]: value }))
  }

  const handleSaveAll = async () => {
    if (!selectedSample) return

    const results = selectedSample.testResults
      .filter((tr) => resultValues[tr.id]?.trim())
      .map((tr) => ({
        id: tr.id,
        resultValue: resultValues[tr.id].trim(),
      }))

    if (results.length === 0) {
      toast.error("Please enter at least one result value")
      return
    }

    setLoading(true)
    try {
      await batchUpdateTestResults(selectedSample.id, results)
      toast.success(
        `Saved ${results.length} result(s) for ${selectedSample.sampleNumber}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save results")
    } finally {
      setLoading(false)
    }
  }

  const handleAddTest = async () => {
    if (!selectedSample || !newParam.trim()) {
      toast.error("Parameter name is required")
      return
    }

    setLoading(true)
    try {
      await addTestsToSample(selectedSample.id, [{
        parameter: newParam.trim(),
        testMethod: newMethod.trim() || undefined,
        unit: newUnit.trim() || undefined,
        specMin: newSpecMin.trim() || undefined,
        specMax: newSpecMax.trim() || undefined,
        tat: newTat ? parseInt(newTat) : undefined,
      }])
      toast.success(`Added parameter "${newParam.trim()}" to ${selectedSample.sampleNumber}`)
      setAddTestOpen(false)
      setNewParam("")
      setNewMethod("")
      setNewUnit("")
      setNewSpecMin("")
      setNewSpecMax("")
      setNewTat("")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to add test parameter")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (testResultId: string, paramName: string) => {
    if (!confirm(`Delete pending parameter "${paramName}"?`)) return

    setLoading(true)
    try {
      await deleteTestResult(testResultId)
      toast.success(`Deleted parameter "${paramName}"`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete test parameter")
    } finally {
      setLoading(false)
    }
  }

  const completedCount = selectedSample?.testResults.filter(
    (tr) => resultValues[tr.id]?.trim() || tr.status === "completed"
  ).length || 0
  const totalCount = selectedSample?.testResults.length || 0

  // Stats for header
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

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* Left: Sample List */}
        <Card className="h-fit">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Samples</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-[120px] text-xs">
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
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {filteredSamples.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No samples found.
              </div>
            ) : (
              <div className="max-h-[calc(100vh-340px)] overflow-y-auto divide-y">
                {filteredSamples.map((sample) => {
                  const completed = sample.testResults.filter((tr) => tr.status === "completed").length
                  const total = sample.testResults.length
                  const isSelected = selectedSampleId === sample.id

                  return (
                    <button
                      key={sample.id}
                      onClick={() => handleSampleSelect(sample.id)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors ${
                        isSelected ? "bg-muted border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium">{sample.sampleNumber}</span>
                        <div className="flex items-center gap-1.5">
                          {statusBadge(sample.status)}
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {sample.client.company || sample.client.name}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{sample.sampleType.name}</span>
                        {total > 0 ? (
                          <span className={`text-xs font-medium ${
                            completed === total ? "text-green-600" : "text-muted-foreground"
                          }`}>
                            {completed}/{total} done
                          </span>
                        ) : (
                          <span className="text-xs text-orange-500">No tests</span>
                        )}
                      </div>
                      {/* Progress bar */}
                      {total > 0 && (
                        <div className="mt-1.5 h-1 w-full rounded-full bg-muted">
                          <div
                            className={`h-1 rounded-full transition-all ${
                              completed === total ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${(completed / total) * 100}%` }}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Test Results Entry */}
        {selectedSample ? (
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {selectedSample.sampleNumber} — {selectedSample.sampleType.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedSample.client.company || selectedSample.client.name}
                    {selectedSample.description && ` — ${selectedSample.description}`}
                    {selectedSample.samplePoint && ` — ${selectedSample.samplePoint}`}
                    {selectedSample.assignedTo && ` — Assigned to ${selectedSample.assignedTo.name}`}
                    <span className="ml-2">
                      ({completedCount}/{totalCount} entered)
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setAddTestOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Test
                  </Button>
                  <Button size="sm" className="h-8" onClick={handleSaveAll} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save Results
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-0 pb-4">
              {selectedSample.testResults.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {selectedSample.testResults.map((tr) => {
                        const currentValue = resultValues[tr.id] || ""
                        const passFail = getPassFail(currentValue, tr.specMin, tr.specMax)
                        const dueStatus = isDueSoon(tr.dueDate)

                        return (
                          <TableRow key={tr.id}>
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
                                  disabled={loading}
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
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FlaskConical className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No test parameters defined
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    This sample has no tests yet. Add parameters to start entering results.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddTestOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Test Parameter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Select a sample to enter results
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a sample from the list on the left to view and enter test results.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Test Parameter</DialogTitle>
            <DialogDescription>
              Add a new test parameter to {selectedSample?.sampleNumber}
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
            <Button variant="outline" onClick={() => setAddTestOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAddTest} disabled={loading}>
              {loading ? (
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
