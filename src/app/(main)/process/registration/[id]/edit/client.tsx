"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Printer } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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

import { Checkbox } from "@/components/ui/checkbox"

import { updateSample, searchCustomers, getCustomerById } from "@/actions/registrations"
import { addTestsToSample, deleteTestResult } from "@/actions/test-results"

type TestParam = {
  parameter: string
  method?: string
  testMethod?: string
  unit?: string
  specMin?: string
  specMax?: string
  tat?: number
}

function parseDefaultTests(defaultTests: string): TestParam[] {
  try {
    const parsed = JSON.parse(defaultTests)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getTestMethodStr(test: TestParam): string {
  return test.method || test.testMethod || ""
}

type SampleTypeOption = {
  id: string
  name: string
  defaultTests: string
}

type Sampler = {
  id: string
  name: string
}

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

type SampleData = {
  id: string
  sampleNumber: string
  clientId: string
  sampleTypeId: string
  description: string | null
  quantity: string | null
  priority: string
  status: string
  jobType: string
  reference: string | null
  samplePoint: string | null
  notes: string | null
  collectedById: string | null
  collectionLocation: string | null
  collectionDate: string | null
  registeredAt: string | null
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
  collectedBy: { name: string } | null
  registeredBy: { name: string } | null
  testResults: TestResult[]
}

const BOTTLE_SIZES = [
  { value: "1 Ltr", label: "1 Ltr" },
  { value: "500 Ml", label: "500 Ml" },
  { value: "300 Ml", label: "300 Ml" },
]

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
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

export function EditSampleClient({
  sample,
  sampleTypes,
  samplers,
}: {
  sample: SampleData
  sampleTypes: SampleTypeOption[]
  samplers: Sampler[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state pre-filled from existing sample
  const [clientId, setClientId] = useState(sample.clientId)
  const [sampleTypeId, setSampleTypeId] = useState(sample.sampleTypeId)
  const [jobType, setJobType] = useState(sample.jobType)
  const [priority, setPriority] = useState(sample.priority)
  const [reference, setReference] = useState(sample.reference || "")
  const [collectedById, setCollectedById] = useState(sample.collectedById || "")
  const [collectionLocation, setCollectionLocation] = useState(sample.collectionLocation || "")
  const [samplePoint, setSamplePoint] = useState(sample.samplePoint || "")
  const [description, setDescription] = useState(sample.description || "")
  const [quantity, setQuantity] = useState(sample.quantity || "1 Ltr")
  const [notes, setNotes] = useState(sample.notes || "")

  // Add test dialog
  const [addTestOpen, setAddTestOpen] = useState(false)
  const [selectedTestIndices, setSelectedTestIndices] = useState<Set<number>>(new Set())
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [newParam, setNewParam] = useState("")
  const [newMethod, setNewMethod] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newSpecMin, setNewSpecMin] = useState("")
  const [newSpecMax, setNewSpecMax] = useState("")
  const [newTat, setNewTat] = useState("")

  // Available tests from template (excluding already added)
  const availableTests = useMemo(() => {
    const st = sampleTypes.find((s) => s.id === sampleTypeId)
    if (!st) return []
    const allTests = parseDefaultTests(st.defaultTests)
    const existingParams = new Set(sample.testResults.map((tr) => tr.parameter.toLowerCase()))
    return allTests.filter((t) => !existingParams.has(t.parameter.toLowerCase()))
  }, [sampleTypeId, sampleTypes, sample.testResults])

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

  // Parse existing date/time
  const existingDate = sample.registeredAt || sample.collectionDate
  const [collectionDate, setCollectionDate] = useState(() => {
    if (existingDate) return new Date(existingDate).toISOString().slice(0, 10)
    return new Date().toISOString().slice(0, 10)
  })
  const [collectionTime, setCollectionTime] = useState(() => {
    if (existingDate) {
      const d = new Date(existingDate)
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    }
    return new Date().toTimeString().slice(0, 5)
  })

  const handleSearchCustomers = useCallback(
    (query: string) => searchCustomers(query),
    []
  )
  const handleGetCustomerById = useCallback(
    (id: string) => getCustomerById(id),
    []
  )

  const sampleTypeOptions = useMemo(
    () => sampleTypes.map((st) => ({ value: st.id, label: st.name })),
    [sampleTypes]
  )

  const samplerOptions = useMemo(() => {
    const opts = samplers.map((s) => ({ value: s.id, label: s.name }))
    if (jobType !== "survey") {
      opts.unshift({ value: "reception", label: "Reception (Walk-in)" })
    }
    return opts
  }, [samplers, jobType])

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Please select a customer")
      return
    }
    if (!sampleTypeId) {
      toast.error("Please select a sample type")
      return
    }

    setLoading(true)
    try {
      await updateSample(sample.id, {
        clientId,
        sampleTypeId,
        jobType,
        priority,
        reference: reference || undefined,
        description: description || undefined,
        collectedById: collectedById && collectedById !== "reception" ? collectedById : undefined,
        collectionLocation: collectedById === "reception" ? (collectionLocation || "Reception") : (collectionLocation || undefined),
        samplePoint: samplePoint || undefined,
        quantity: quantity || undefined,
        notes: notes || undefined,
        collectionDate: `${collectionDate}T${collectionTime}`,
      })
      toast.success(`Sample ${sample.sampleNumber} updated`)
      router.push(`/process/registration/${sample.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update sample")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddTest = () => {
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

  const handleAddTest = async () => {
    const testsToAdd: { parameter: string; testMethod?: string; unit?: string; specMin?: string; specMax?: string; tat?: number }[] = []

    // Add selected template tests
    selectedTestIndices.forEach((idx) => {
      const t = availableTests[idx]
      if (t) {
        testsToAdd.push({
          parameter: t.parameter,
          testMethod: getTestMethodStr(t) || undefined,
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

    setLoading(true)
    try {
      await addTestsToSample(sample.id, testsToAdd)
      toast.success(`Added ${testsToAdd.length} parameter(s)`)
      setAddTestOpen(false)
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

  const completedTests = sample.testResults.filter((tr) => tr.status === "completed").length
  const totalTests = sample.testResults.length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/process/registration/${sample.id}`}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <PageHeader title={`Edit ${sample.sampleNumber}`} />
          {statusBadge(sample.status)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/samples/${sample.id}/label`, "_blank")}
        >
          <Printer className="mr-1 h-3.5 w-3.5" /> Print Label
        </Button>
      </div>

      {/* Info Bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span>Registered by: <strong className="text-foreground">{sample.registeredBy?.name || "-"}</strong></span>
        <span>Collected by: <strong className="text-foreground">{sample.collectedBy?.name || "-"}</strong></span>
        <span>Assigned to: <strong className="text-foreground">{sample.assignedTo?.name || "Not assigned"}</strong></span>
        <span>Date: <strong className="text-foreground">{existingDate ? new Date(existingDate).toLocaleDateString() : "-"}</strong></span>
      </div>

      {/* Job Details */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-[1fr_110px_110px_auto] gap-x-3 gap-y-2">
            {/* Row 1 */}
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Customer *</Label>
              <AsyncSearchableSelect
                value={clientId}
                onValueChange={setClientId}
                searchFn={handleSearchCustomers}
                getByIdFn={handleGetCustomerById}
                placeholder="Search customer..."
                searchPlaceholder="Type customer name..."
              />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Job Type</Label>
              <Select value={jobType} onValueChange={(v) => {
                setJobType(v)
                if (v === "survey" && collectedById === "reception") {
                  setCollectedById("")
                }
              }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="rush">Rush</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Rec. Date & Time</Label>
              <div className="flex gap-1.5">
                <Input className="h-9" type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
                <Input className="h-9 w-[150px]" type="time" value={collectionTime} onChange={(e) => setCollectionTime(e.target.value)} />
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Reference / PO</Label>
              <Input className="h-9" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number" />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input className="h-9" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} placeholder="Ajman Port" />
            </div>
            <div className="col-span-2 grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sampler</Label>
              <SearchableSelect
                options={samplerOptions}
                value={collectedById}
                onValueChange={setCollectedById}
                placeholder="Select sampler..."
                searchPlaceholder="Search..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Details */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sample Type *</Label>
              <SearchableSelect
                options={sampleTypeOptions}
                value={sampleTypeId}
                onValueChange={setSampleTypeId}
                placeholder="Select..."
                searchPlaceholder="Search..."
              />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Bottle Size</Label>
              <Select value={quantity} onValueChange={setQuantity}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOTTLE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sample Point</Label>
              <Input className="h-9" value={samplePoint} onChange={(e) => setSamplePoint(e.target.value)} placeholder="Tank No-4" />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input className="h-9" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. MHC Oil" />
            </div>
            <div className="col-span-2 md:col-span-4 grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Notes / Remarks</Label>
              <Textarea className="min-h-[50px] text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Parameters */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Test Parameters ({completedTests}/{totalTests} completed)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleOpenAddTest}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Parameter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-3">
          {sample.testResults.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Parameter</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs">Unit</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                    <TableHead className="text-xs">Spec Min</TableHead>
                    <TableHead className="text-xs">Spec Max</TableHead>
                    <TableHead className="text-xs">TAT</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-[28px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.testResults.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium text-xs py-1.5">{tr.parameter}</TableCell>
                      <TableCell className="text-xs py-1.5">{tr.testMethod || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">{tr.unit || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        {tr.resultValue ? (
                          <span className="font-mono">{tr.resultValue}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-1.5">{tr.specMin || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">{tr.specMax || "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">{tr.tat ? `${tr.tat}d` : "-"}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        {tr.dueDate ? new Date(tr.dueDate).toLocaleDateString() : "-"}
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
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No test parameters defined for this sample.
              <Button
                variant="link"
                size="sm"
                className="ml-1 text-sm p-0 h-auto"
                onClick={handleOpenAddTest}
              >
                Add one now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/process/registration/${sample.id}`}>Cancel</Link>
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Add Test Dialog */}
      <Dialog open={addTestOpen} onOpenChange={setAddTestOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Test Parameters</DialogTitle>
            <DialogDescription>
              Add tests to {sample.sampleNumber} ({sampleTypes.find((s) => s.id === sampleTypeId)?.name})
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
                          <TableCell className="text-xs py-1.5">{getTestMethodStr(test) || "-"}</TableCell>
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
                {sample.testResults.length
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
