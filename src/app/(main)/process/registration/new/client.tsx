"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, ChevronDown, ChevronUp, Printer, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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

import { createSample, searchCustomers, getCustomerById } from "@/actions/registrations"

type SampleTypeOption = {
  id: string
  name: string
  defaultTests: string
}

type Sampler = {
  id: string
  name: string
}

type TestParam = {
  parameter: string
  method?: string
  testMethod?: string
  unit?: string
  specMin?: string
  specMax?: string
}

const BOTTLE_SIZES = [
  { value: "1 Ltr", label: "1 Ltr" },
  { value: "500 Ml", label: "500 Ml" },
  { value: "300 Ml", label: "300 Ml" },
]

type SampleRow = {
  id: number
  sampleTypeId: string
  bottleQty: string
  samplePoint: string
  description: string
  remarks: string
  selectedTests: Set<number>
  expanded: boolean
}

let rowIdCounter = 1

function createEmptyRow(): SampleRow {
  return {
    id: rowIdCounter++,
    sampleTypeId: "",
    bottleQty: "1 Ltr",
    samplePoint: "",
    description: "",
    remarks: "",
    selectedTests: new Set(),
    expanded: false,
  }
}

function getTestMethod(test: TestParam): string {
  return test.method || test.testMethod || ""
}

export function NewRegistrationClient({
  sampleTypes,
  samplers,
}: {
  sampleTypes: SampleTypeOption[]
  samplers: Sampler[]
}) {
  const [loading, setLoading] = useState(false)

  // Success state
  const [registeredIds, setRegisteredIds] = useState<string[]>([])
  const [registeredNumbers, setRegisteredNumbers] = useState<string[]>([])

  // Shared fields
  const [clientId, setClientId] = useState("")
  const [jobType, setJobType] = useState("testing")
  const [priority, setPriority] = useState("normal")
  const [reference, setReference] = useState("")
  const [collectedById, setCollectedById] = useState("")
  const [collectionLocation, setCollectionLocation] = useState("")

  // Sample rows
  const [samples, setSamples] = useState<SampleRow[]>([createEmptyRow()])

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

  const samplerOptions = useMemo(
    () => samplers.map((s) => ({ value: s.id, label: s.name })),
    [samplers]
  )

  const getTestsForType = (sampleTypeId: string): TestParam[] => {
    if (!sampleTypeId) return []
    const st = sampleTypes.find((s) => s.id === sampleTypeId)
    if (!st?.defaultTests) return []
    try {
      const parsed = JSON.parse(st.defaultTests)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const updateRow = (id: number, updates: Partial<SampleRow>) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  const handleSampleTypeChange = (rowId: number, value: string) => {
    const tests = getTestsForType(value)
    updateRow(rowId, {
      sampleTypeId: value,
      selectedTests: new Set<number>(),
      expanded: tests.length > 0,
    })
  }

  const toggleTest = (rowId: number, index: number) => {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== rowId) return s
        const next = new Set(s.selectedTests)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return { ...s, selectedTests: next }
      })
    )
  }

  const toggleAllTests = (rowId: number) => {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== rowId) return s
        const tests = getTestsForType(s.sampleTypeId)
        if (s.selectedTests.size === tests.length) {
          return { ...s, selectedTests: new Set() }
        }
        return { ...s, selectedTests: new Set(tests.map((_, i) => i)) }
      })
    )
  }

  const addSampleRow = () => setSamples((prev) => [...prev, createEmptyRow()])

  const removeSampleRow = (id: number) => {
    if (samples.length <= 1) return
    setSamples((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleExpanded = (id: number) => {
    updateRow(id, { expanded: !samples.find((s) => s.id === id)?.expanded })
  }

  const resetForm = () => {
    setClientId("")
    setJobType("testing")
    setPriority("normal")
    setReference("")
    setCollectedById("")
    setCollectionLocation("")
    setRegisteredIds([])
    setRegisteredNumbers([])
    rowIdCounter = 1
    setSamples([createEmptyRow()])
  }

  const handlePrintLabels = () => {
    window.open(`/api/samples/labels?ids=${registeredIds.join(",")}`, "_blank")
  }

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Please select a customer")
      return
    }
    const validSamples = samples.filter((s) => s.sampleTypeId)
    if (validSamples.length === 0) {
      toast.error("Please add at least one sample with a sample type")
      return
    }
    for (const s of validSamples) {
      const tests = getTestsForType(s.sampleTypeId)
      if (tests.length > 0 && s.selectedTests.size === 0) {
        toast.error("Each sample must have at least one test selected")
        return
      }
    }

    setLoading(true)
    try {
      const resultIds: string[] = []
      const resultNumbers: string[] = []
      for (const s of validSamples) {
        const tests = getTestsForType(s.sampleTypeId)
        const sample = await createSample({
          clientId,
          sampleTypeId: s.sampleTypeId,
          jobType,
          priority,
          reference: reference || undefined,
          description: s.description || undefined,
          collectedById: collectedById || undefined,
          samplePoint: s.samplePoint || undefined,
          collectionLocation: collectionLocation || undefined,
          quantity: s.bottleQty || undefined,
          notes: s.remarks || undefined,
          selectedTests: tests.length > 0 ? Array.from(s.selectedTests) : undefined,
        })
        resultIds.push(sample.id)
        resultNumbers.push(sample.sampleNumber)
      }
      setRegisteredIds(resultIds)
      setRegisteredNumbers(resultNumbers)
      toast.success(
        resultNumbers.length === 1
          ? `Sample ${resultNumbers[0]} registered`
          : `${resultNumbers.length} samples registered`
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to register samples")
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (registeredIds.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/process/registration">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <PageHeader title="Registration Complete" />
        </div>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <h3 className="text-base font-semibold">
                {registeredNumbers.length === 1
                  ? "1 Sample Registered"
                  : `${registeredNumbers.length} Samples Registered — Each bottle has its own label`}
              </h3>
            </div>

            {/* Individual sample bottles */}
            <div className="rounded border divide-y text-sm mb-4">
              {registeredNumbers.map((num, idx) => (
                <div key={num} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-5">{idx + 1}</span>
                    <Badge variant="outline" className="font-mono">{num}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => window.open(`/api/samples/${registeredIds[idx]}/label`, "_blank")}
                  >
                    <Printer className="mr-1 h-3 w-3" /> Print Label
                  </Button>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={handlePrintLabels}>
                <Printer className="mr-2 h-4 w-4" /> Print All Labels ({registeredNumbers.length})
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" /> Register More
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/process/registration">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/process/registration">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <PageHeader title="Register New Samples" />
      </div>

      {/* Job Details */}
      <Card>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5">
            <div className="col-span-2 grid gap-1">
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
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Job Type</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
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
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Reference / PO</Label>
              <Input className="h-9" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input className="h-9" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} placeholder="e.g. Ajman Port" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Sampler</Label>
              <SearchableSelect
                options={samplerOptions}
                value={collectedById}
                onValueChange={setCollectedById}
                placeholder="Select..."
                searchPlaceholder="Search..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Rows - Table style */}
      <Card>
        <CardContent className="py-2 px-3">
          {/* Column headers */}
          <div className="grid grid-cols-[28px_1fr_100px_1fr_1fr_1fr_80px_28px] gap-x-2 items-center px-1 pb-1 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>#</span>
            <span>Sample Type *</span>
            <span>Bottle</span>
            <span>Sample Point</span>
            <span>Description</span>
            <span>Remarks</span>
            <span>Tests</span>
            <span></span>
          </div>
          <div className="divide-y">
            {samples.map((row, idx) => {
              const tests = getTestsForType(row.sampleTypeId)
              return (
                <div key={row.id}>
                  {/* Main row */}
                  <div className="grid grid-cols-[28px_1fr_100px_1fr_1fr_1fr_80px_28px] gap-x-2 items-center py-1.5 px-1">
                    <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                    <SearchableSelect
                      options={sampleTypeOptions}
                      value={row.sampleTypeId}
                      onValueChange={(v) => handleSampleTypeChange(row.id, v)}
                      placeholder="Select..."
                      searchPlaceholder="Search..."
                      className="h-8 text-xs"
                    />
                    <Select value={row.bottleQty} onValueChange={(v) => updateRow(row.id, { bottleQty: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BOTTLE_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-8 text-xs" value={row.samplePoint} onChange={(e) => updateRow(row.id, { samplePoint: e.target.value })} placeholder="Tank No-4" />
                    <Input className="h-8 text-xs" value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} placeholder="e.g. MHC Oil" />
                    <Input className="h-8 text-xs" value={row.remarks} onChange={(e) => updateRow(row.id, { remarks: e.target.value })} placeholder="Notes..." />
                    {tests.length > 0 ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 justify-start" onClick={() => toggleExpanded(row.id)}>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 mr-1">{row.selectedTests.size}/{tests.length}</Badge>
                        {row.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                    {samples.length > 1 ? (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeSampleRow(row.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    ) : <span />}
                  </div>

                  {/* Expanded test panel */}
                  {row.expanded && tests.length > 0 && (
                    <div className="ml-7 mr-1 mb-1.5 rounded border text-xs overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center gap-3 px-2 py-1 bg-muted/50 border-b">
                        <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.preventDefault(); toggleAllTests(row.id) }}>
                          <Checkbox checked={row.selectedTests.size === tests.length} className="h-3.5 w-3.5" tabIndex={-1} />
                          <span className="font-medium">Select All</span>
                        </label>
                        <span className="ml-auto text-muted-foreground">{row.selectedTests.size}/{tests.length}</span>
                      </div>
                      {/* Test list */}
                      <div className="max-h-[200px] overflow-y-auto divide-y">
                        {tests.map((test, testIdx) => (
                          <label
                            key={testIdx}
                            className="flex items-center gap-3 px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
                            onClick={(e) => { e.preventDefault(); toggleTest(row.id, testIdx) }}
                          >
                            <Checkbox checked={row.selectedTests.has(testIdx)} className="h-3.5 w-3.5 shrink-0" tabIndex={-1} />
                            <span className="font-medium min-w-0 flex-1">{test.parameter}</span>
                            <span className="text-muted-foreground shrink-0 w-24">{getTestMethod(test) || "-"}</span>
                            <span className="text-muted-foreground shrink-0 w-16 text-right">{test.unit || "-"}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addSampleRow}>
          <Plus className="mr-1 h-3 w-3" /> Add Sample
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/process/registration">Cancel</Link>
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Registering...</>
            ) : (
              `Register ${samples.filter((s) => s.sampleTypeId).length} Sample(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
