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
  ArrowLeft,
  ClipboardCheck,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

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

type RegistrationGroup = {
  key: string
  clientId: string
  clientName: string
  reference: string | null
  registeredAt: string
  location: string | null
  sampleCount: number
  completedCount: number
  allResultsEntered: boolean
  status: string
  samples: Sample[]
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

const groupStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>
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
  { value: "pending", label: "Pending" },
]

// ============= MAIN COMPONENT =============

export function TestResultsClient({ groups }: { groups: RegistrationGroup[] }) {
  const router = useRouter()

  // View state: null = list view, group = entry view
  const [selectedGroup, setSelectedGroup] = useState<RegistrationGroup | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  // Result entry state
  const [resultValues, setResultValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {}
    groups.forEach((g) => {
      g.samples.forEach((s) => {
        s.testResults.forEach((tr) => {
          values[tr.id] = tr.resultValue || ""
        })
      })
    })
    return values
  })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [releasingAll, setReleasingAll] = useState(false)

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

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (statusFilter === "all") return groups
    return groups.filter((g) => g.status === statusFilter)
  }, [groups, statusFilter])

  // Stats
  const totalGroups = groups.length
  const pendingCount = groups.filter((g) => g.status === "pending" || g.status === "assigned").length
  const testingCount = groups.filter((g) => g.status === "testing").length
  const doneCount = groups.filter((g) => g.status === "completed").length

  // ============= HANDLERS =============

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

  const handleReleaseAll = async () => {
    if (!selectedGroup) return

    setReleasingAll(true)
    try {
      // Save any unsaved results across all samples in the group
      for (const sample of selectedGroup.samples) {
        const unsavedResults = sample.testResults
          .filter((tr) => tr.status === "pending" && resultValues[tr.id]?.trim())
          .map((tr) => ({
            id: tr.id,
            resultValue: resultValues[tr.id].trim(),
          }))

        if (unsavedResults.length > 0) {
          await batchUpdateTestResults(sample.id, unsavedResults)
        }
      }

      toast.success("All results saved and released")
      setSelectedGroup(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to release results")
    } finally {
      setReleasingAll(false)
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

  // ============= RENDER: TEST ENTRY VIEW =============

  if (selectedGroup) {
    const group = selectedGroup
    // Recalculate from live resultValues
    const totalTests = group.samples.reduce((sum, s) => sum + s.testResults.length, 0)
    const completedTests = group.samples.reduce(
      (sum, s) => sum + s.testResults.filter((tr) => tr.status === "completed" || resultValues[tr.id]?.trim()).length,
      0
    )
    const canRelease = group.samples.every((s) =>
      s.testResults.length > 0 &&
      s.testResults.every((tr) => tr.status === "completed" || resultValues[tr.id]?.trim())
    )

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedGroup(null)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{group.clientName}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {group.reference && <span>Ref: {group.reference}</span>}
              {group.location && <span>| {group.location}</span>}
              <span>| {format(new Date(group.registeredAt), "dd MMM yyyy HH:mm")}</span>
              <span>| {group.sampleCount} sample{group.sampleCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full transition-all ${
                    completedTests === totalTests ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: totalTests > 0 ? `${(completedTests / totalTests) * 100}%` : "0%" }}
                />
              </div>
              <span className={`text-sm font-medium ${
                completedTests === totalTests ? "text-green-600" : "text-muted-foreground"
              }`}>
                {completedTests}/{totalTests}
              </span>
            </div>
            {groupStatusBadge(group.status)}
          </div>
        </div>

        {/* Tabs for each sample */}
        <Tabs defaultValue={group.samples[0]?.id} className="space-y-4">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
            {group.samples.map((sample) => {
              const sCompleted = sample.testResults.filter((tr) => tr.status === "completed").length
              const sTotal = sample.testResults.length
              const allDone = sTotal > 0 && sCompleted === sTotal
              return (
                <TabsTrigger
                  key={sample.id}
                  value={sample.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border"
                >
                  <span className="font-mono text-xs">{sample.sampleNumber}</span>
                  <span className="ml-1.5 text-xs opacity-70">{sample.sampleType.name}</span>
                  {allDone ? (
                    <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100 text-[9px] px-1">Done</Badge>
                  ) : sTotal > 0 ? (
                    <span className="ml-2 text-[10px] opacity-60">{sCompleted}/{sTotal}</span>
                  ) : null}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {group.samples.map((sample) => {
            const isSaving = savingIds.has(sample.id)
            const hasEnteredValues = sample.testResults.some(
              (tr) => tr.status === "pending" && resultValues[tr.id]?.trim()
            )

            return (
              <TabsContent key={sample.id} value={sample.id} className="space-y-3 mt-0">
                {/* Sample info */}
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono font-semibold">{sample.sampleNumber}</span>
                      {sampleStatusBadge(sample.status)}
                      <span className="text-muted-foreground">{sample.sampleType.name}</span>
                      {sample.description && (
                        <span className="text-muted-foreground">| {sample.description}</span>
                      )}
                      {sample.samplePoint && (
                        <span className="text-muted-foreground">| {sample.samplePoint}</span>
                      )}
                      {sample.assignedTo && (
                        <span className="text-muted-foreground">| {sample.assignedTo.name}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

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

                    {/* Action buttons per sample */}
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
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
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
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        {/* Release All bar */}
        <div className="flex items-center justify-end border-t pt-4">
          <Button
            onClick={handleReleaseAll}
            disabled={!canRelease || releasingAll}
          >
            {releasingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Release All Results
              </>
            )}
          </Button>
        </div>

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

  // ============= RENDER: REGISTRATION LIST VIEW =============

  const columns: ColumnDef<RegistrationGroup, any>[] = [
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.clientName}</span>
      ),
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => row.original.reference || "-",
    },
    {
      id: "samples",
      header: "Samples",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.sampleCount} sample{row.original.sampleCount !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const g = row.original
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  g.completedCount === g.sampleCount ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: g.sampleCount > 0 ? `${(g.completedCount / g.sampleCount) * 100}%` : "0%" }}
              />
            </div>
            <span className={`text-xs font-medium ${
              g.completedCount === g.sampleCount ? "text-green-600" : "text-muted-foreground"
            }`}>
              {g.completedCount}/{g.sampleCount}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => groupStatusBadge(row.original.status),
    },
    {
      accessorKey: "registeredAt",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.registeredAt), "dd MMM yyyy"),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedGroup(row.original)}
        >
          Enter Results
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      ),
    },
  ]

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
            <p className="text-xs text-muted-foreground">Total Registrations</p>
            <p className="text-2xl font-bold">{totalGroups}</p>
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
            {filteredGroups.length} registration{filteredGroups.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Registration Groups Table */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground mb-1">
              No registrations found
            </p>
            <p className="text-xs text-muted-foreground">
              Samples assigned to you will appear here for test result entry.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredGroups}
          searchPlaceholder="Search by client..."
          searchKey="clientName"
        />
      )}
    </div>
  )
}
