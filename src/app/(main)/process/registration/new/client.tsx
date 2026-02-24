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
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/process/registration">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <PageHeader title="Registration Complete" />
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold">
                  {registeredNumbers.length === 1
                    ? "Sample Registered Successfully"
                    : `${registeredNumbers.length} Samples Registered`}
                </h3>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {registeredNumbers.map((num) => (
                    <Badge key={num} variant="outline" className="text-sm font-mono">{num}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handlePrintLabels}>
                  <Printer className="mr-2 h-4 w-4" /> Print QR Labels
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" /> Register More
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/process/registration">View All</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2">
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

      {/* Sample Rows */}
      {samples.map((row, idx) => {
        const tests = getTestsForType(row.sampleTypeId)
        const typeName = sampleTypes.find((st) => st.id === row.sampleTypeId)?.name

        return (
          <Card key={row.id} className="border-l-4 border-l-primary/30">
            <CardContent className="py-3 px-4">
              {/* Row header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">#{idx + 1}</Badge>
                  {typeName && <span className="text-sm font-medium">{typeName}</span>}
                  {row.samplePoint && <span className="text-xs text-muted-foreground">- {row.samplePoint}</span>}
                  {tests.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {row.selectedTests.size}/{tests.length} tests
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {tests.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => toggleExpanded(row.id)}>
                      {row.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span className="ml-1">Tests</span>
                    </Button>
                  )}
                  {samples.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeSampleRow(row.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Sample Type *</Label>
                  <SearchableSelect
                    options={sampleTypeOptions}
                    value={row.sampleTypeId}
                    onValueChange={(v) => handleSampleTypeChange(row.id, v)}
                    placeholder="Select type..."
                    searchPlaceholder="Search..."
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Bottle Size</Label>
                  <Select value={row.bottleQty} onValueChange={(v) => updateRow(row.id, { bottleQty: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOTTLE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Sample Point</Label>
                  <Input className="h-9" value={row.samplePoint} onChange={(e) => updateRow(row.id, { samplePoint: e.target.value })} placeholder="Tank No-4" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input className="h-9" value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} placeholder="e.g. MHC Oil" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Remarks</Label>
                  <Input className="h-9" value={row.remarks} onChange={(e) => updateRow(row.id, { remarks: e.target.value })} placeholder="Notes..." />
                </div>
              </div>

              {/* Test parameters - compact */}
              {row.expanded && tests.length > 0 && (
                <div className="mt-2 rounded border text-xs">
                  <div className="flex items-center justify-between px-2 py-1 bg-muted/50 border-b">
                    <span className="font-medium">
                      {row.selectedTests.size}/{tests.length} test(s)
                    </span>
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => toggleAllTests(row.id)}>
                      {row.selectedTests.size === tests.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="w-8 px-2 py-1"></th>
                          <th className="text-left px-2 py-1 font-medium">Parameter</th>
                          <th className="text-left px-2 py-1 font-medium">Method</th>
                          <th className="text-left px-2 py-1 font-medium">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test, testIdx) => (
                          <tr
                            key={testIdx}
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => toggleTest(row.id, testIdx)}
                          >
                            <td className="px-2 py-1">
                              <Checkbox
                                checked={row.selectedTests.has(testIdx)}
                                onCheckedChange={() => toggleTest(row.id, testIdx)}
                                className="h-3.5 w-3.5"
                              />
                            </td>
                            <td className="px-2 py-1 font-medium">{test.parameter}</td>
                            <td className="px-2 py-1 text-muted-foreground">{getTestMethod(test) || "-"}</td>
                            <td className="px-2 py-1 text-muted-foreground">{test.unit || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Actions bar */}
      <div className="flex items-center justify-between pb-4">
        <Button variant="outline" size="sm" onClick={addSampleRow}>
          <Plus className="mr-1 h-4 w-4" /> Add Sample
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/process/registration">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</>
            ) : (
              `Register ${samples.filter((s) => s.sampleTypeId).length} Sample(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
