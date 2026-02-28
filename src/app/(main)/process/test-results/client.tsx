"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  FlaskConical,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Search,
  MessageSquare,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

import { Textarea } from "@/components/ui/textarea"
import {
  batchUpdateTestResults,
  addTestsToSample,
  deleteTestResult,
  getReportRemarks,
  getPrefilledRemarks,
  createPrefilledRemark,
  deletePrefilledRemark,
} from "@/actions/test-results"

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
  subSampleNumber: number | null
  sampleGroup: string | null
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
  registration: { id: string; registrationNumber: string; samplingMethod: string; sheetNumber: string | null } | null
  notes: string | null
  testResults: TestResult[]
  reports: { summary: string | null; status: string; reviewedBy: { name: string } | null }[]
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
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Registered</Badge>
    case "assigned":
      return <Badge variant="default" className="text-[10px] px-1.5 py-0">Assigned</Badge>
    case "testing":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] px-1.5 py-0">Testing</Badge>
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] px-1.5 py-0">Completed</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>
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
  { value: "revision", label: "Revision Required" },
  { value: "registered", label: "Registered" },
  { value: "assigned", label: "Assigned" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
]

// ============= MAIN COMPONENT =============

export function TestResultsClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null)
  const [collapsedRegs, setCollapsedRegs] = useState<Set<string>>(new Set())

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

  // Remarks state
  const [remarksText, setRemarksText] = useState("")
  const [prefilledRemarksList, setPrefilledRemarksList] = useState<{ id: string; text: string }[]>([])
  const [remarksLoaded, setRemarksLoaded] = useState<string | null>(null)
  const [newRemarkText, setNewRemarkText] = useState("")

  // Load remarks when a sample is selected
  const loadRemarks = useCallback(async (sampleId: string) => {
    if (remarksLoaded === sampleId) return
    try {
      const [existingRemarks, prefilled] = await Promise.all([
        getReportRemarks(sampleId),
        prefilledRemarksList.length === 0 ? getPrefilledRemarks() : Promise.resolve(prefilledRemarksList),
      ])
      setRemarksText(existingRemarks)
      setPrefilledRemarksList(prefilled)
      setRemarksLoaded(sampleId)
    } catch {
      // silently fail
    }
  }, [remarksLoaded, prefilledRemarksList])

  useEffect(() => {
    if (selectedSampleId) {
      loadRemarks(selectedSampleId)
    } else {
      setRemarksText("")
      setRemarksLoaded(null)
    }
  }, [selectedSampleId, loadRemarks])

  const handleAddPrefilledRemark = async () => {
    if (!newRemarkText.trim()) return
    try {
      const remark = await createPrefilledRemark(newRemarkText.trim())
      setPrefilledRemarksList((prev) => [...prev, remark].sort((a, b) => a.text.localeCompare(b.text)))
      setNewRemarkText("")
    } catch (error: any) {
      toast.error(error.message || "Failed to create remark")
    }
  }

  const handleDeletePrefilledRemark = async (id: string) => {
    try {
      await deletePrefilledRemark(id)
      setPrefilledRemarksList((prev) => prev.filter((r) => r.id !== id))
    } catch (error: any) {
      toast.error(error.message || "Failed to delete remark")
    }
  }

  const handleInsertRemark = (text: string) => {
    setRemarksText((prev) => {
      if (prev.trim()) return prev.trim() + "\n" + text
      return text
    })
  }

  const toggleRegCollapse = (regNumber: string) => {
    setCollapsedRegs((prev) => {
      const next = new Set(prev)
      if (next.has(regNumber)) next.delete(regNumber)
      else next.add(regNumber)
      return next
    })
  }

  // Filtered samples
  const filteredSamples = useMemo(() => {
    let result = samples
    if (statusFilter !== "all") {
      if (statusFilter === "revision") {
        result = result.filter((s) => s.reports.length > 0 && s.reports[0].status === "revision")
      } else {
        result = result.filter((s) => s.status === statusFilter)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) =>
        s.sampleNumber.toLowerCase().includes(q) ||
        s.sampleType.name.toLowerCase().includes(q) ||
        s.client.name.toLowerCase().includes(q) ||
        (s.client.company && s.client.company.toLowerCase().includes(q)) ||
        (s.samplePoint && s.samplePoint.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.registration && s.registration.registrationNumber.toLowerCase().includes(q))
      )
    }
    return result
  }, [samples, statusFilter, searchQuery])

  // Selected sample
  const selectedSample = useMemo(
    () => samples.find((s) => s.id === selectedSampleId) || null,
    [samples, selectedSampleId]
  )

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

    if (results.length === 0 && !remarksText.trim()) {
      toast.error("Please enter at least one result value or remarks")
      return
    }

    setSavingIds((prev) => new Set(prev).add(sample.id))
    try {
      await batchUpdateTestResults(sample.id, results, remarksText.trim() || undefined)
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

  const isSaving = selectedSample ? savingIds.has(selectedSample.id) : false
  const hasEnteredValues = selectedSample
    ? selectedSample.testResults.some(
        (tr) => tr.status === "pending" && resultValues[tr.id]?.trim()
      ) || remarksText.trim().length > 0
    : false

  return (
    <div className="space-y-2">
      {/* Split panel layout */}
      <div className="flex gap-3" style={{ height: "calc(100vh - 120px)" }}>
        {/* LEFT PANEL — Sample List */}
        <div className="w-[340px] shrink-0 flex flex-col border rounded-lg overflow-hidden">
          {/* Filter bar */}
          <div className="px-2 py-1.5 border-b bg-muted/30 space-y-1.5">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-xs flex-1">
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
              <span className="text-[10px] text-muted-foreground shrink-0">
                {filteredSamples.length} sample{filteredSamples.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search samples..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>
          </div>

          {/* Sample items - grouped by registration, collapsible */}
          <ScrollArea className="flex-1">
            {filteredSamples.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FlaskConical className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No samples found</p>
              </div>
            ) : (
              <div>
                {(() => {
                  // Group samples: registration → sample type sub-groups
                  type RegGroup = {
                    regNumber: string | null
                    regId: string | null
                    totalSamples: number
                    completedSamples: number
                    typeGroups: { typeName: string; samples: Sample[] }[]
                  }
                  const regGroups: RegGroup[] = []
                  const regMap = new Map<string, { regId: string; samples: Sample[] }>()
                  const standalone: Sample[] = []

                  for (const sample of filteredSamples) {
                    if (sample.registration) {
                      const key = sample.registration.registrationNumber
                      if (!regMap.has(key)) regMap.set(key, { regId: sample.registration.id, samples: [] })
                      regMap.get(key)!.samples.push(sample)
                    } else {
                      standalone.push(sample)
                    }
                  }

                  // Build registration groups with type sub-groups
                  for (const [regNumber, { regId, samples: regSamples }] of regMap) {
                    const typeMap = new Map<string, Sample[]>()
                    for (const s of regSamples) {
                      const typeName = s.sampleType.name
                      if (!typeMap.has(typeName)) typeMap.set(typeName, [])
                      typeMap.get(typeName)!.push(s)
                    }
                    const completedCount = regSamples.filter((s) => s.status === "completed").length
                    regGroups.push({
                      regNumber,
                      regId,
                      totalSamples: regSamples.length,
                      completedSamples: completedCount,
                      typeGroups: Array.from(typeMap.entries()).map(([typeName, typeSamples]) => ({
                        typeName,
                        samples: typeSamples.sort((a, b) => (a.subSampleNumber ?? 0) - (b.subSampleNumber ?? 0)),
                      })),
                    })
                  }
                  // Standalone samples as individual items (no grouping needed)
                  if (standalone.length > 0) {
                    regGroups.push({
                      regNumber: null,
                      regId: null,
                      totalSamples: standalone.length,
                      completedSamples: standalone.filter((s) => s.status === "completed").length,
                      typeGroups: [{ typeName: "", samples: standalone }],
                    })
                  }

                  return regGroups.map((reg) => {
                    const isCollapsed = reg.regNumber ? collapsedRegs.has(reg.regNumber) : false
                    // Check if selected sample is in this group
                    const hasSelectedSample = reg.typeGroups.some((tg) =>
                      tg.samples.some((s) => s.id === selectedSampleId)
                    )
                    // Aggregate test progress for the group header
                    const allTests = reg.typeGroups.flatMap((tg) => tg.samples.flatMap((s) => s.testResults))
                    const completedTests = allTests.filter((tr) => tr.status === "completed").length
                    const totalTests = allTests.length
                    const typeSummary = reg.typeGroups
                      .filter((tg) => tg.typeName)
                      .map((tg) => `${tg.typeName} (${tg.samples.length})`)
                      .join(", ")

                    return (
                      <div key={reg.regNumber || "standalone"}>
                        {/* Registration header — collapsible */}
                        {reg.regNumber && (
                          <button
                            type="button"
                            className={`w-full text-left px-2 py-1.5 bg-muted/60 border-b hover:bg-muted/80 transition-colors ${
                              hasSelectedSample ? "border-l-2 border-l-primary" : ""
                            }`}
                            onClick={() => toggleRegCollapse(reg.regNumber!)}
                          >
                            <div className="flex items-center gap-1.5">
                              {isCollapsed ? (
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-[10px] font-mono font-bold text-foreground">
                                {reg.regNumber}
                              </span>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {reg.totalSamples}
                              </Badge>
                              {totalTests > 0 && (
                                <div className="flex items-center gap-1 ml-auto">
                                  <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        completedTests === totalTests ? "bg-green-500" : "bg-blue-500"
                                      }`}
                                      style={{ width: `${(completedTests / totalTests) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground">
                                    {completedTests}/{totalTests}
                                  </span>
                                </div>
                              )}
                            </div>
                            {typeSummary && (
                              <div className="text-[9px] text-muted-foreground mt-0.5 ml-[18px] truncate">
                                {typeSummary}
                              </div>
                            )}
                          </button>
                        )}
                        {/* Expanded content */}
                        {!isCollapsed && reg.typeGroups.map((tg) => (
                          <div key={`${reg.regNumber}-${tg.typeName}`}>
                            {/* Type sub-header (only for registration groups with known type) */}
                            {reg.regNumber && tg.typeName && (
                              <div className="px-3 py-0.5 bg-muted/30 border-b flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {tg.typeName}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {tg.samples.length}
                                </span>
                              </div>
                            )}
                            {/* Samples */}
                            {tg.samples.map((sample, sIdx) => {
                              const isSelected = selectedSampleId === sample.id
                              const sCompletedTests = sample.testResults.filter((tr) => tr.status === "completed").length
                              const sTotalTests = sample.testResults.length
                              const hasRevision = sample.reports.length > 0 && sample.reports[0].status === "revision"
                              const shortNum = sample.sampleNumber
                              // Build detail line: sample point, description, bottle size
                              const details = [
                                sample.samplePoint,
                                sample.description,
                                sample.quantity ? `${sample.quantity}` : null,
                              ].filter(Boolean).join(" · ")

                              const statusDot = sample.status === "completed"
                                ? "bg-green-500"
                                : sample.status === "testing"
                                  ? "bg-blue-500"
                                  : sample.status === "assigned"
                                    ? "bg-primary"
                                    : "bg-muted-foreground/40"

                              return (
                                <button
                                  key={sample.id}
                                  type="button"
                                  className={`w-full text-left px-2.5 py-1 hover:bg-muted/50 transition-colors border-b ${
                                    isSelected ? "bg-muted border-l-2 border-l-primary" : ""
                                  } ${hasRevision ? "border-l-2 border-l-amber-500" : ""}`}
                                  onClick={() => setSelectedSampleId(sample.id)}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
                                      <span className="font-mono text-[11px] font-semibold shrink-0">{shortNum}</span>
                                      {details && (
                                        <span className="text-[9px] text-muted-foreground truncate">
                                          {details}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {hasRevision && (
                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[9px] px-1 py-0">Rev</Badge>
                                      )}
                                      {sTotalTests > 0 && (
                                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{sCompletedTests}/{sTotalTests}</span>
                                      )}
                                    </div>
                                  </div>
                                  {!reg.regNumber && (
                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                      {sample.sampleType.name}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT PANEL — Test Entry */}
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          {!selectedSample ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <ChevronRight className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Select a sample
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a sample from the list to enter or view test results.
              </p>
            </div>
          ) : (
            <>
              {/* Sample header */}
              <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm font-semibold">{selectedSample.sampleNumber}</span>
                  {sampleStatusBadge(selectedSample.status)}
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedSample.sampleType.name}
                  </span>
                  {selectedSample.registration && (
                    <span className="text-[10px] text-muted-foreground">
                      ({selectedSample.registration.registrationNumber})
                      {selectedSample.registration.samplingMethod && selectedSample.registration.samplingMethod !== "NP" && (
                        <> — {selectedSample.registration.samplingMethod}</>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleOpenAddTest(selectedSample)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Test
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSaveSample(selectedSample)}
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
              </div>

              {/* Sample details line */}
              <div className="px-3 py-1.5 border-b text-[11px] text-muted-foreground flex items-center gap-4 flex-wrap">
                <span>{selectedSample.client.company || selectedSample.client.name}</span>
                {selectedSample.samplePoint && <span>Point: {selectedSample.samplePoint}</span>}
                {selectedSample.collectionLocation && <span>Location: {selectedSample.collectionLocation}</span>}
                {selectedSample.assignedTo && <span>Assigned: {selectedSample.assignedTo.name}</span>}
                {selectedSample.reference && <span>Ref: {selectedSample.reference}</span>}
                {selectedSample.quantity && <span>Size: {selectedSample.quantity}</span>}
                {selectedSample.description && <span>Desc: {selectedSample.description}</span>}
                {selectedSample.notes && <span>Notes: {selectedSample.notes}</span>}
              </div>

              {/* Revision banner */}
              {selectedSample.reports.length > 0 && selectedSample.reports[0].status === "revision" && (
                <div className="px-3 py-2 border-b bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-medium text-amber-800 dark:text-amber-400">Revision Required</span>
                    {selectedSample.reports[0].reviewedBy && (
                      <span className="text-amber-700 dark:text-amber-500"> by {selectedSample.reports[0].reviewedBy.name}</span>
                    )}
                    {selectedSample.reports[0].summary && (
                      <p className="text-amber-700 dark:text-amber-500 mt-0.5">{selectedSample.reports[0].summary}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Test results table + remarks */}
              <div className="flex-1 overflow-auto">
                {selectedSample.testResults.length > 0 ? (
                  <div className="p-2 space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] w-[28px] py-1.5">#</TableHead>
                          <TableHead className="text-[10px] py-1.5">Parameter</TableHead>
                          <TableHead className="text-[10px] py-1.5">Method</TableHead>
                          <TableHead className="text-[10px] py-1.5">Unit</TableHead>
                          <TableHead className="text-[10px] py-1.5 w-[140px]">Result</TableHead>
                          <TableHead className="text-[10px] py-1.5">Min</TableHead>
                          <TableHead className="text-[10px] py-1.5">Max</TableHead>
                          <TableHead className="text-[10px] py-1.5">Due</TableHead>
                          <TableHead className="text-[10px] py-1.5">Status</TableHead>
                          <TableHead className="text-[10px] py-1.5 w-[28px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSample.testResults.map((tr, idx) => {
                          const currentValue = resultValues[tr.id] || ""
                          const passFail = getPassFail(currentValue, tr.specMin, tr.specMax)
                          const dueStatus = isDueSoon(tr.dueDate)

                          return (
                            <TableRow key={tr.id}>
                              <TableCell className="text-[10px] text-muted-foreground py-1">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium text-xs py-1">
                                {tr.parameter}
                              </TableCell>
                              <TableCell className="text-[10px] py-1">{tr.testMethod || "-"}</TableCell>
                              <TableCell className="text-[10px] py-1">{tr.unit || "-"}</TableCell>
                              <TableCell className="py-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={currentValue}
                                    onChange={(e) => handleResultChange(tr.id, e.target.value)}
                                    placeholder="Result..."
                                    className={`h-7 text-xs ${
                                      passFail === "fail"
                                        ? "border-red-400 focus-visible:ring-red-400"
                                        : passFail === "pass"
                                          ? "border-green-400 focus-visible:ring-green-400"
                                          : ""
                                    }`}
                                  />
                                  {passFail === "pass" && (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0 text-[9px] px-1 py-0">P</Badge>
                                  )}
                                  {passFail === "fail" && (
                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 shrink-0 text-[9px] px-1 py-0">F</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] py-1">{tr.specMin || "-"}</TableCell>
                              <TableCell className="text-[10px] py-1">{tr.specMax || "-"}</TableCell>
                              <TableCell className="text-[10px] py-1">
                                {tr.dueDate ? (
                                  <span className={
                                    dueStatus === "overdue" ? "text-red-600 font-medium" :
                                    dueStatus === "due-today" ? "text-orange-600 font-medium" :
                                    dueStatus === "due-soon" ? "text-yellow-600" : ""
                                  }>
                                    {format(new Date(tr.dueDate), "dd MMM")}
                                    {dueStatus === "overdue" && " !"}
                                  </span>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="py-1">
                                {tr.status === "pending" ? (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Pending</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[9px] px-1 py-0">Done</Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-1">
                                {tr.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
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

                    {/* Remarks Section */}
                    <div className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-medium">Report Remarks</Label>
                      </div>

                      {/* Prefilled remarks chips */}
                      {prefilledRemarksList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {prefilledRemarksList.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-muted/50 hover:bg-muted transition-colors"
                              onClick={() => handleInsertRemark(r.text)}
                            >
                              <Plus className="h-2.5 w-2.5" />
                              {r.text}
                            </button>
                          ))}
                        </div>
                      )}

                      <Textarea
                        value={remarksText}
                        onChange={(e) => setRemarksText(e.target.value)}
                        placeholder="Enter remarks to display on the report..."
                        className="text-xs min-h-[60px] resize-none"
                        rows={3}
                      />

                      {/* Manage prefilled remarks */}
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={newRemarkText}
                          onChange={(e) => setNewRemarkText(e.target.value)}
                          placeholder="Add a reusable remark..."
                          className="h-7 text-xs flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddPrefilledRemark()
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={handleAddPrefilledRemark}
                          disabled={!newRemarkText.trim()}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Save Remark
                        </Button>
                      </div>

                      {/* List of saved remarks with delete option */}
                      {prefilledRemarksList.length > 0 && (
                        <details className="text-xs">
                          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                            Manage saved remarks ({prefilledRemarksList.length})
                          </summary>
                          <div className="mt-1.5 space-y-1">
                            {prefilledRemarksList.map((r) => (
                              <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/30">
                                <span className="text-xs truncate">{r.text}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive shrink-0"
                                  onClick={() => handleDeletePrefilledRemark(r.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FlaskConical className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">
                      No test parameters defined.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleOpenAddTest(selectedSample)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Test Parameter
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

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
