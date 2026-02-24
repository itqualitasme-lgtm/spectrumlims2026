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
import { Textarea } from "@/components/ui/textarea"
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

export function NewRegistrationClient({
  sampleTypes,
  samplers,
}: {
  sampleTypes: SampleTypeOption[]
  samplers: Sampler[]
}) {
  const [loading, setLoading] = useState(false)

  // Success state after registration
  const [registeredIds, setRegisteredIds] = useState<string[]>([])
  const [registeredNumbers, setRegisteredNumbers] = useState<string[]>([])

  // Shared header state
  const [clientId, setClientId] = useState("")
  const [jobType, setJobType] = useState("testing")
  const [priority, setPriority] = useState("normal")
  const [reference, setReference] = useState("")
  const [collectedById, setCollectedById] = useState("")
  const [collectionLocation, setCollectionLocation] = useState("")

  // Multi-sample rows
  const [samples, setSamples] = useState<SampleRow[]>([createEmptyRow()])

  // Async customer search
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

  // Get available tests for a specific sample type
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

  const updateSampleRow = (id: number, updates: Partial<SampleRow>) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  const handleSampleTypeChange = (rowId: number, value: string) => {
    const tests = getTestsForType(value)
    updateSampleRow(rowId, {
      sampleTypeId: value,
      selectedTests: new Set(tests.map((_, i) => i)),
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

  const addSampleRow = () => {
    setSamples((prev) => [...prev, createEmptyRow()])
  }

  const removeSampleRow = (id: number) => {
    if (samples.length <= 1) return
    setSamples((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleExpanded = (id: number) => {
    updateSampleRow(id, {
      expanded: !samples.find((s) => s.id === id)?.expanded,
    })
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

  const handleRegisterMore = () => {
    resetForm()
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
          ? `Sample ${resultNumbers[0]} registered successfully`
          : `${resultNumbers.length} samples registered successfully`
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to register samples")
    } finally {
      setLoading(false)
    }
  }

  // Show success state after registration
  if (registeredIds.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/process/registration">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <PageHeader title="Registration Complete" />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold">
                  {registeredNumbers.length === 1
                    ? "Sample Registered Successfully"
                    : `${registeredNumbers.length} Samples Registered Successfully`}
                </h3>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {registeredNumbers.map((num) => (
                    <Badge key={num} variant="outline" className="text-sm font-mono">
                      {num}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handlePrintLabels} size="lg">
                  <Printer className="mr-2 h-4 w-4" />
                  Print QR Labels
                </Button>
                <Button variant="outline" onClick={handleRegisterMore} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Register More
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/process/registration">View All Samples</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/process/registration">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <PageHeader title="Register New Samples" />
      </div>

      {/* Shared Header: Client, Job Type, Priority, Reference, Sampler, Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label className="text-xs">Customer *</Label>
                <AsyncSearchableSelect
                  value={clientId}
                  onValueChange={setClientId}
                  searchFn={handleSearchCustomers}
                  getByIdFn={handleGetCustomerById}
                  placeholder="Search customer..."
                  searchPlaceholder="Type customer name..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Job Type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="rush">Rush</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Reference / PO</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="PO number"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Collected By (Sampler)</Label>
                <SearchableSelect
                  options={samplerOptions}
                  value={collectedById}
                  onValueChange={setCollectedById}
                  placeholder="Sampler..."
                  searchPlaceholder="Search..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Collection Location</Label>
                <Input
                  value={collectionLocation}
                  onChange={(e) => setCollectionLocation(e.target.value)}
                  placeholder="e.g. Ajman Port"
                />
              </div>
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
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                  {typeName && <span className="text-sm font-medium">{typeName}</span>}
                  {row.samplePoint && <span className="text-xs text-muted-foreground">- {row.samplePoint}</span>}
                  {tests.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {row.selectedTests.size}/{tests.length} tests
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {tests.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleExpanded(row.id)}
                    >
                      {row.expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="ml-1 text-xs">Tests</span>
                    </Button>
                  )}
                  {samples.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeSampleRow(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid gap-3">
                {/* Sample row fields */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Sample Type *</Label>
                    <SearchableSelect
                      options={sampleTypeOptions}
                      value={row.sampleTypeId}
                      onValueChange={(v) => handleSampleTypeChange(row.id, v)}
                      placeholder="Select type..."
                      searchPlaceholder="Search..."
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Bottle Size</Label>
                    <Select
                      value={row.bottleQty}
                      onValueChange={(v) => updateSampleRow(row.id, { bottleQty: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BOTTLE_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Sample Point</Label>
                    <Input
                      value={row.samplePoint}
                      onChange={(e) => updateSampleRow(row.id, { samplePoint: e.target.value })}
                      placeholder="Tank No-4"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={row.description}
                      onChange={(e) => updateSampleRow(row.id, { description: e.target.value })}
                      placeholder="e.g. MHC Oil"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      value={row.remarks}
                      onChange={(e) => updateSampleRow(row.id, { remarks: e.target.value })}
                      placeholder="Notes..."
                    />
                  </div>
                </div>

                {/* Expandable test parameters */}
                {row.expanded && tests.length > 0 && (
                  <div className="rounded-md border mt-2">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                      <span className="text-xs font-medium">
                        {row.selectedTests.size} of {tests.length} test(s) selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => toggleAllTests(row.id)}
                      >
                        {row.selectedTests.size === tests.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead className="text-xs">Parameter</TableHead>
                          <TableHead className="text-xs">Method</TableHead>
                          <TableHead className="text-xs">Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((test, testIdx) => (
                          <TableRow
                            key={testIdx}
                            className="cursor-pointer"
                            onClick={() => toggleTest(row.id, testIdx)}
                          >
                            <TableCell className="py-1.5">
                              <Checkbox
                                checked={row.selectedTests.has(testIdx)}
                                onCheckedChange={() => toggleTest(row.id, testIdx)}
                              />
                            </TableCell>
                            <TableCell className="py-1.5 text-xs font-medium">{test.parameter}</TableCell>
                            <TableCell className="py-1.5 text-xs">{test.testMethod || "-"}</TableCell>
                            <TableCell className="py-1.5 text-xs">{test.unit || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Add Sample + Submit */}
      <div className="flex items-center justify-between pb-6">
        <Button variant="outline" onClick={addSampleRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add Sample
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/process/registration">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering {samples.filter((s) => s.sampleTypeId).length} sample(s)...
              </>
            ) : (
              `Register ${samples.filter((s) => s.sampleTypeId).length} Sample(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
