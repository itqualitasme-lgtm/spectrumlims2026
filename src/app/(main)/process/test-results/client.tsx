"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  FlaskConical,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
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
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { Checkbox } from "@/components/ui/checkbox"

import { batchUpdateTestResults, addTestsToSample, deleteTestResult } from "@/actions/test-results"

// ============= TYPES =============

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

type TestParam = {
  parameter: string
  method?: string
  testMethod?: string
  unit?: string
  specMin?: string
  specMax?: string
  tat?: number
}

type Sample = {
  id: string
  sampleNumber: string
  status: string
  samplePoint: string | null
  description: string | null
  quantity: string | null
  reference: string | null
  collectionLocation: string | null
  createdAt: string
  registeredAt: string | null
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string; defaultTests: string }
  assignedTo: { name: string } | null
  testResults: TestResult[]
}

// ============= HELPERS =============

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
      return <Badge variant="outline">Registered</Badge>
    case "assigned":
      return <Badge variant="default">Assigned</Badge>
    case "testing":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Testing</Badge>
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function parseDefaultTests(defaultTests: string): TestParam[] {
  try {
    const parsed = JSON.parse(defaultTests)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getTestMethod(test: TestParam): string {
  return test.method || test.testMethod || ""
}

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "registered", label: "Registered" },
  { value: "assigned", label: "Assigned" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
]

// ============= MAIN COMPONENT =============

export function TestResultsClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Result entry state
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

  // Add test dialog
  const [addTestOpen, setAddTestOpen] = useState(false)
  const [addTestSample, setAddTestSample] = useState<Sample | null>(null)
  const [selectedTestIndices, setSelectedTestIndices] = useState<Set<number>>(new Set())
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [newParam, setNewParam] = useState("")
  const [newMethod, setNewMethod] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newSpecMin, setNewSpecMin] = useState("")
  const [newSpecMax, setNewSpecMax] = useState("")
  const [newTat, setNewTat] = useState("")
  const [addTestLoading, setAddTestLoading] = useState(false)

  // Filtered samples
  const filteredSamples = useMemo(() => {
    if (statusFilter === "all") return samples
    return samples.filter((s) => s.status === statusFilter)
  }, [samples, statusFilter])

  // Stats
  const totalSamples = samples.length
  const pendingCount = samples.filter((s) => s.status === "registered" || s.status === "assigned").length
  const testingCount = samples.filter((s) => s.status === "testing").length
  const doneCount = samples.filter((s) => s.status === "completed").length

  // ============= HANDLERS =============

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
      toast.success(`Saved ${results.length} result(s) for ${sample.sampleNumber}`)
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
    setAddTestSample(sample)
    setSelectedTestIndices(new Set())
    setShowCustomForm(false)
    setNewParam("")
    setNewMethod("")
    setNewUnit("")
    setNewSpecMin("")
    setNewSpecMax("")
    setNewTat("")
    setAddTestOpen(true)
  }

  // Get available tests (from template, excluding already-added ones)
  const availableTests = useMemo(() => {
    if (!addTestSample) return []
    const allTests = parseDefaultTests(addTestSample.sampleType.defaultTests)
    const existingParams = new Set(addTestSample.testResults.map((tr) => tr.parameter.toLowerCase()))
    return allTests.filter((t) => !existingParams.has(t.parameter.toLowerCase()))
  }, [addTestSample])

  const toggleTestIndex = (idx: number) => {
    setSelectedTestIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAllTests = () => {
    if (selectedTestIndices.size === availableTests.length) {
      setSelectedTestIndices(new Set())
    } else {
      setSelectedTestIndices(new Set(availableTests.map((_, i) => i)))
    }
  }

  const handleAddTest = async () => {
    if (!addTestSample) return

    const testsToAdd: { parameter: string; testMethod?: string; unit?: string; specMin?: string; specMax?: string; tat?: number }[] = []

    // Add selected template tests
    selectedTestIndices.forEach((idx) => {
      const t = availableTests[idx]
      if (t) {
        testsToAdd.push({
          parameter: t.parameter,
          testMethod: getTestMethod(t) || undefined,
          unit: t.unit || undefined,
          specMin: t.specMin || undefined,
          specMax: t.specMax || undefined,
          tat: t.tat || undefined,
        })
      }
    })

    // Add custom test if filled
    if (showCustomForm && newParam.trim()) {
      testsToAdd.push({
        parameter: newParam.trim(),
        testMethod: newMethod.trim() || undefined,
        unit: newUnit.trim() || undefined,
        specMin: newSpecMin.trim() || undefined,
        specMax: newSpecMax.trim() || undefined,
        tat: newTat ? parseInt(newTat) : undefined,
      })
    }

    if (testsToAdd.length === 0) {
      toast.error("Select at least one test or fill in the custom parameter")
      return
    }

    setAddTestLoading(true)
    try {
      await addTestsToSample(addTestSample.id, testsToAdd)
      toast.success(`Added ${testsToAdd.length} parameter(s) to ${addTestSample.sampleNumber}`)
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

  // ============= RENDER =============

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

      {/* Samples List */}
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
            const isExpanded = expandedIds.has(sample.id)
            const isSaving = savingIds.has(sample.id)
            const completedTests = sample.testResults.filter((tr) => tr.status === "completed").length
            const totalTests = sample.testResults.length
            const hasEnteredValues = sample.testResults.some(
              (tr) => tr.status === "pending" && resultValues[tr.id]?.trim()
            )

            return (
              <Collapsible key={sample.id} open={isExpanded} onOpenChange={() => toggleExpand(sample.id)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm font-semibold">{sample.sampleNumber}</span>
                        {sampleStatusBadge(sample.status)}
                        <span className="text-sm text-muted-foreground truncate">
                          {sample.client.company || sample.client.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sample.sampleType.name}
                        </span>
                        {sample.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            — {sample.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {totalTests > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  completedTests === totalTests ? "bg-green-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${(completedTests / totalTests) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              completedTests === totalTests ? "text-green-600" : "text-muted-foreground"
                            }`}>
                              {completedTests}/{totalTests}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sample.registeredAt || sample.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-3 space-y-3 border-t">
                      {/* Sample info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3">
                        {sample.samplePoint && <span>Point: {sample.samplePoint}</span>}
                        {sample.collectionLocation && <span>Location: {sample.collectionLocation}</span>}
                        {sample.assignedTo && <span>Assigned: {sample.assignedTo.name}</span>}
                        {sample.reference && <span>Ref: {sample.reference}</span>}
                        {sample.quantity && <span>Size: {sample.quantity}</span>}
                      </div>

                      {/* Test Results Table */}
                      {sample.testResults.length > 0 ? (
                        <>
                          <div className="rounded-md border">
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
                                            onChange={(e) => handleResultChange(tr.id, e.target.value)}
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

                          {/* Action buttons */}
                          <div className="flex items-center justify-between">
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
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>
      )}

      {/* Add Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Test Parameters</DialogTitle>
            <DialogDescription>
              Add tests to {addTestSample?.sampleNumber} ({addTestSample?.sampleType.name})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Template tests checklist */}
            {availableTests.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Available Tests</Label>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={toggleAllTests}
                  >
                    <Checkbox checked={selectedTestIndices.size === availableTests.length && availableTests.length > 0} />
                    <span>Select All</span>
                  </button>
                </div>
                <div className="rounded-md border max-h-[250px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[32px]"></TableHead>
                        <TableHead className="text-xs">Parameter</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs">Unit</TableHead>
                        <TableHead className="text-xs">TAT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableTests.map((test, idx) => (
                        <TableRow
                          key={idx}
                          className="cursor-pointer"
                          onClick={() => toggleTestIndex(idx)}
                        >
                          <TableCell className="py-1.5">
                            <Checkbox checked={selectedTestIndices.has(idx)} />
                          </TableCell>
                          <TableCell className="text-xs font-medium py-1.5">{test.parameter}</TableCell>
                          <TableCell className="text-xs py-1.5">{getTestMethod(test) || "-"}</TableCell>
                          <TableCell className="text-xs py-1.5">{test.unit || "-"}</TableCell>
                          <TableCell className="text-xs py-1.5">{test.tat ? `${test.tat}d` : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {selectedTestIndices.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTestIndices.size} test{selectedTestIndices.size !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                {addTestSample?.testResults.length
                  ? "All available tests from the template are already added."
                  : "No template tests defined for this sample type."}
              </p>
            )}

            {/* Custom test toggle */}
            {!showCustomForm ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => setShowCustomForm(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Custom Parameter
              </Button>
            ) : (
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Custom Parameter</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-xs px-1"
                    onClick={() => setShowCustomForm(false)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">Parameter Name *</Label>
                    <Input
                      className="h-8 text-xs"
                      value={newParam}
                      onChange={(e) => setNewParam(e.target.value)}
                      placeholder="e.g. Viscosity"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">Test Method</Label>
                    <Input
                      className="h-8 text-xs"
                      value={newMethod}
                      onChange={(e) => setNewMethod(e.target.value)}
                      placeholder="e.g. ASTM D445"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">Unit</Label>
                    <Input
                      className="h-8 text-xs"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="cSt"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">Spec Min</Label>
                    <Input
                      className="h-8 text-xs"
                      value={newSpecMin}
                      onChange={(e) => setNewSpecMin(e.target.value)}
                      placeholder="min"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">Spec Max</Label>
                    <Input
                      className="h-8 text-xs"
                      value={newSpecMax}
                      onChange={(e) => setNewSpecMax(e.target.value)}
                      placeholder="max"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground">TAT (days)</Label>
                    <Input
                      className="h-8 text-xs"
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
            )}
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
                `Add ${selectedTestIndices.size + (showCustomForm && newParam.trim() ? 1 : 0)} Parameter${
                  selectedTestIndices.size + (showCustomForm && newParam.trim() ? 1 : 0) !== 1 ? "s" : ""
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
