"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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

import { createRegistration, searchCustomers, getCustomerById, getCustomerAddress } from "@/actions/registrations"

type SampleTypeOption = {
  id: string
  name: string
  specificationStandard?: string | null
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
  tat?: number
}

const BOTTLE_SIZES = [
  { value: "1 Ltr", label: "1 Ltr" },
  { value: "500 Ml", label: "500 Ml" },
  { value: "300 Ml", label: "300 Ml" },
]

type SampleRow = {
  id: number
  groupId: number  // rows with the same groupId share sample type + tests
  sampleTypeId: string
  bottleQty: string
  samplePoint: string
  description: string
  remarks: string
  selectedTests: Set<number>
  expanded: boolean
}

let rowIdCounter = 1
let groupIdCounter = 1

function createEmptyRow(): SampleRow {
  const gid = groupIdCounter++
  return {
    id: rowIdCounter++,
    groupId: gid,
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
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [registrationId, setRegistrationId] = useState("")
  const [registeredSamples, setRegisteredSamples] = useState<{ id: string; sampleNumber: string; sampleType: string; subSampleNumber: number; sampleGroup: string | null; samplePoint: string | null; bottleQty: string | null; description: string | null }[]>([])

  // Shared fields
  const [clientId, setClientId] = useState("")
  const [jobType, setJobType] = useState("testing")
  const [priority, setPriority] = useState("normal")
  const [reference, setReference] = useState("")
  const [collectedById, setCollectedById] = useState("")
  const [collectionLocation, setCollectionLocation] = useState("")
  const [collectionDate, setCollectionDate] = useState("")
  const [collectionTime, setCollectionTime] = useState("")
  const [sampleCondition, setSampleCondition] = useState("Sealed")
  const [samplingMethod, setSamplingMethod] = useState("NP")
  const [sheetNumber, setSheetNumber] = useState("")

  // Set date/time on client only to avoid hydration mismatch
  useEffect(() => {
    if (!collectionDate) setCollectionDate(new Date().toISOString().slice(0, 10))
    if (!collectionTime) setCollectionTime(new Date().toTimeString().slice(0, 5))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleClientChange = async (id: string) => {
    setClientId(id)
    if (id) {
      const address = await getCustomerAddress(id)
      if (address) setCollectionLocation(address)
    }
  }

  const sampleTypeOptions = useMemo(
    () => sampleTypes.map((st) => ({
      value: st.id,
      label: st.specificationStandard ? `${st.name} — ${st.specificationStandard}` : st.name,
    })),
    [sampleTypes]
  )

  const samplerOptions = useMemo(() => {
    const opts = samplers.map((s) => ({ value: s.id, label: s.name }))
    if (jobType !== "survey") {
      opts.unshift({ value: "reception", label: "Reception (Walk-in)" })
    }
    return opts
  }, [samplers, jobType])

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
    // Propagate to all rows in the same group
    setSamples((prev) => {
      const row = prev.find((s) => s.id === rowId)
      if (!row) return prev
      return prev.map((s) =>
        s.groupId === row.groupId
          ? { ...s, sampleTypeId: value, selectedTests: new Set<number>(), expanded: s.id === rowId && tests.length > 0 }
          : s
      )
    })
  }

  const toggleTest = (rowId: number, index: number) => {
    setSamples((prev) => {
      const row = prev.find((s) => s.id === rowId)
      if (!row) return prev
      const next = new Set(row.selectedTests)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      // Propagate to all rows in same group
      return prev.map((s) =>
        s.groupId === row.groupId ? { ...s, selectedTests: new Set(next) } : s
      )
    })
  }

  const toggleAllTests = (rowId: number) => {
    setSamples((prev) => {
      const row = prev.find((s) => s.id === rowId)
      if (!row) return prev
      const tests = getTestsForType(row.sampleTypeId)
      const newSelected = row.selectedTests.size === tests.length
        ? new Set<number>()
        : new Set(tests.map((_, i) => i))
      return prev.map((s) =>
        s.groupId === row.groupId ? { ...s, selectedTests: new Set(newSelected) } : s
      )
    })
  }

  // Handle qty change: expand/contract rows in the group
  const handleQtyChange = (rowId: number, newQty: number) => {
    const qty = Math.max(1, Math.min(99, newQty))
    setSamples((prev) => {
      const row = prev.find((s) => s.id === rowId)
      if (!row) return prev
      const groupId = row.groupId
      const groupRows = prev.filter((s) => s.groupId === groupId)
      const currentQty = groupRows.length

      if (qty === currentQty) return prev

      // Find the position of the last row in this group
      const lastGroupIdx = prev.findLastIndex((s) => s.groupId === groupId)

      if (qty > currentQty) {
        // Add more rows after the last row in the group
        const newRows: SampleRow[] = []
        for (let i = 0; i < qty - currentQty; i++) {
          newRows.push({
            id: rowIdCounter++,
            groupId,
            sampleTypeId: row.sampleTypeId,
            bottleQty: row.bottleQty,
            samplePoint: "",
            description: "",
            remarks: row.remarks,
            selectedTests: new Set(row.selectedTests),
            expanded: false,
          })
        }
        const result = [...prev]
        result.splice(lastGroupIdx + 1, 0, ...newRows)
        return result
      } else {
        // Remove rows from the end of the group
        const toRemove = currentQty - qty
        // Remove from the end of the group
        const reversedGroupIds: number[] = []
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].groupId === groupId) {
            reversedGroupIds.push(i)
          }
        }
        const removeIndices = new Set(reversedGroupIds.slice(0, toRemove))
        return prev.filter((_, i) => !removeIndices.has(i))
      }
    })
  }

  const addSampleRow = () => setSamples((prev) => [...prev, createEmptyRow()])

  const removeGroup = (groupId: number) => {
    setSamples((prev) => {
      const remaining = prev.filter((s) => s.groupId !== groupId)
      return remaining.length > 0 ? remaining : [createEmptyRow()]
    })
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
    setCollectionDate(new Date().toISOString().slice(0, 10))
    setCollectionTime(new Date().toTimeString().slice(0, 5))
    setSampleCondition("Sealed")
    setRegistrationNumber("")
    setRegistrationId("")
    setRegisteredSamples([])
    rowIdCounter = 1
    groupIdCounter = 1
    setSamples([createEmptyRow()])
  }

  const handlePrintLabels = () => {
    const ids = registeredSamples.map((s) => s.id).join(",")
    window.open(`/api/samples/labels?ids=${ids}`, "_blank")
  }

  const totalSampleCount = samples.filter((s) => s.sampleTypeId).length

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Please select a customer")
      return
    }
    if (!collectedById) {
      toast.error("Please select a sampler or Reception")
      return
    }
    const validSamples = samples.filter((s) => s.sampleTypeId)
    if (validSamples.length === 0) {
      toast.error("Please add at least one sample with a sample type")
      return
    }
    for (const s of validSamples) {
      const tests = getTestsForType(s.sampleTypeId)
      if (tests.length === 0) {
        const stName = sampleTypes.find((st) => st.id === s.sampleTypeId)?.name || "selected type"
        toast.error(`No tests configured for "${stName}". Please add tests to this sample type first.`)
        return
      }
      if (s.selectedTests.size === 0) {
        toast.error("Each sample must have at least one test selected")
        return
      }
      if (!s.samplePoint.trim()) {
        toast.error("Sample Point is required for every sample")
        return
      }
    }

    setLoading(true)
    try {
      const result = await createRegistration({
        clientId,
        jobType,
        priority,
        reference: reference || undefined,
        collectedById: collectedById && collectedById !== "reception" ? collectedById : undefined,
        collectionLocation: collectedById === "reception" ? (collectionLocation || "Reception") : (collectionLocation || undefined),
        collectionDate: `${collectionDate}T${collectionTime}`,
        sampleCondition: sampleCondition || undefined,
        samplingMethod: samplingMethod || undefined,
        sheetNumber: sheetNumber || undefined,
        rows: validSamples.map((s) => ({
          sampleTypeId: s.sampleTypeId,
          qty: 1,
          bottleQty: s.bottleQty,
          samplePoint: s.samplePoint || undefined,
          description: s.description || undefined,
          remarks: s.remarks || undefined,
          selectedTests: Array.from(s.selectedTests),
        })),
      })
      setRegistrationId(result.registrationId)
      setRegistrationNumber(result.registrationNumber)
      setRegisteredSamples(result.samples)
      toast.success(`Registration ${result.registrationNumber} created with ${result.samples.length} samples`)
    } catch (error: any) {
      toast.error(error.message || "Failed to register samples")
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (registeredSamples.length > 0) {
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
              <div>
                <h3 className="text-base font-semibold">
                  {registrationNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {registeredSamples.length} sample{registeredSamples.length !== 1 ? "s" : ""} registered — each has its own QR label
                </p>
              </div>
            </div>

            {/* Sub-samples table */}
            {(() => {
              const hasGroups = registeredSamples.some((s) => s.sampleGroup)
              const cols = hasGroups
                ? "grid-cols-[40px_40px_180px_1fr_1fr_80px_1fr_auto]"
                : "grid-cols-[40px_180px_1fr_1fr_80px_1fr_auto]"
              return (
            <div className="rounded border text-sm mb-4 overflow-x-auto">
              <div className={`grid ${cols} gap-x-3 px-3 py-1.5 bg-muted/50 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide min-w-[700px]`}>
                <span>Sub#</span>
                {hasGroups && <span>Group</span>}
                <span>Sample No.</span>
                <span>Sample Type</span>
                <span>Sample Point</span>
                <span>Bottle</span>
                <span>Description</span>
                <span></span>
              </div>
              <div className="divide-y min-w-[700px]">
                {registeredSamples.map((s) => (
                  <div key={s.id} className={`grid ${cols} gap-x-3 items-center px-3 py-2`}>
                    <span className="text-xs text-muted-foreground font-mono">{String(s.subSampleNumber).padStart(2, "0")}</span>
                    {hasGroups && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-fit">{s.sampleGroup}</Badge>}
                    <Badge variant="outline" className="font-mono w-fit">{s.sampleNumber}</Badge>
                    <span className="truncate text-xs">{s.sampleType}</span>
                    <span className="truncate text-xs">{s.samplePoint || "-"}</span>
                    <span className="text-xs">{s.bottleQty || "-"}</span>
                    <span className="truncate text-xs">{s.description || "-"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(`/api/samples/${s.id}/label`, "_blank")}
                    >
                      <Printer className="mr-1 h-3 w-3" /> Print
                    </Button>
                  </div>
                ))}
              </div>
            </div>
              )
            })()}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button onClick={handlePrintLabels}>
                <Printer className="mr-2 h-4 w-4" /> Print All Labels ({registeredSamples.length})
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
          <div className="grid grid-cols-2 md:grid-cols-[1fr_110px_110px_auto] gap-x-3 gap-y-1.5">
            {/* Row 1: Customer, Job Type, Priority, Date/Time */}
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Customer *</Label>
              <AsyncSearchableSelect
                value={clientId}
                onValueChange={handleClientChange}
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
                <Input className="h-9 w-[180px]" type="time" value={collectionTime} onChange={(e) => setCollectionTime(e.target.value)} />
              </div>
            </div>
          </div>
          {/* Row 2: Reference, Location, Sampler (wider), Condition */}
          <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.5fr_120px] gap-x-3 gap-y-1.5 mt-1.5">
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Reference / PO</Label>
              <Input className="h-9" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number" />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input className="h-9" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} placeholder="Customer address" />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sampler / Reception *</Label>
              <SearchableSelect
                options={samplerOptions}
                value={collectedById}
                onValueChange={setCollectedById}
                placeholder="Select sampler..."
                searchPlaceholder="Search..."
              />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Condition</Label>
              <Select value={sampleCondition} onValueChange={setSampleCondition}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sealed">Sealed</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Leaking">Leaking</SelectItem>
                  <SelectItem value="Opened">Opened</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Row 3: Sampling, Sheet No */}
          <div className="grid grid-cols-2 md:grid-cols-[150px_200px_1fr] gap-x-3 gap-y-1.5 mt-1.5">
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sampling</Label>
              <Select value={samplingMethod} onValueChange={setSamplingMethod}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NP">NP</SelectItem>
                  <SelectItem value="Running Sample">Running Sample</SelectItem>
                  <SelectItem value="UML">UML</SelectItem>
                  <SelectItem value="TUMLB">TUMLB</SelectItem>
                  <SelectItem value="Multi Level">Multi Level</SelectItem>
                  <SelectItem value="DB">DB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Sheet No.</Label>
              <Input className="h-9" value={sheetNumber} onChange={(e) => setSheetNumber(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Rows - Table style */}
      <Card>
        <CardContent className="py-2 px-3">
          {/* Column headers */}
          <div className="grid grid-cols-[28px_1fr_60px_100px_1fr_1fr_1fr_80px_28px] gap-x-2 items-center px-1 pb-1 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>#</span>
            <span>Sample Type *</span>
            <span>Qty</span>
            <span>Bottle</span>
            <span>Sample Point *</span>
            <span>Description</span>
            <span>Remarks</span>
            <span>Tests</span>
            <span></span>
          </div>
          <div className="divide-y">
            {samples.map((row, idx) => {
              const tests = getTestsForType(row.sampleTypeId)
              const groupRows = samples.filter((s) => s.groupId === row.groupId)
              const isFirstInGroup = groupRows[0]?.id === row.id
              return (
                <div key={row.id} className={!isFirstInGroup ? "bg-muted/20" : ""}>
                  {/* Main row */}
                  <div className="grid grid-cols-[28px_1fr_60px_100px_1fr_1fr_1fr_80px_28px] gap-x-2 items-center py-1.5 px-1">
                    <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>

                    {isFirstInGroup ? (
                      <>
                        <SearchableSelect
                          options={sampleTypeOptions}
                          value={row.sampleTypeId}
                          onValueChange={(v) => handleSampleTypeChange(row.id, v)}
                          placeholder="Select..."
                          searchPlaceholder="Search..."
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          min={1}
                          max={25}
                          className="h-8 text-xs text-center"
                          value={groupRows.length}
                          onChange={(e) => handleQtyChange(row.id, Math.max(1, Math.min(25, parseInt(e.target.value) || 1)))}
                        />
                        <Select value={row.bottleQty} onValueChange={(v) => updateRow(row.id, { bottleQty: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BOTTLE_SIZES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground italic pl-1">↳ {(() => { const st = sampleTypes.find((s) => s.id === row.sampleTypeId); return st ? (st.specificationStandard ? `${st.name} — ${st.specificationStandard}` : st.name) : "" })()}</span>
                        <span />
                        <Select value={row.bottleQty} onValueChange={(v) => updateRow(row.id, { bottleQty: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BOTTLE_SIZES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    <Input className="h-8 text-xs" value={row.samplePoint} onChange={(e) => updateRow(row.id, { samplePoint: e.target.value })} placeholder="Tank No-4" />
                    <Input className="h-8 text-xs" value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} placeholder="e.g. MHC Oil" />
                    <Input className="h-8 text-xs" value={row.remarks} onChange={(e) => updateRow(row.id, { remarks: e.target.value })} placeholder="Notes..." />

                    {isFirstInGroup ? (
                      <>
                        {tests.length > 0 ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 justify-start" onClick={() => toggleExpanded(row.id)}>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 mr-1">{row.selectedTests.size}/{tests.length}</Badge>
                            {row.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {/* Delete entire group */}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeGroup(row.groupId)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span />
                        <span />
                      </>
                    )}
                  </div>

                  {/* Expanded test panel — only on first row of group */}
                  {isFirstInGroup && row.expanded && tests.length > 0 && (
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
                            <span className="text-muted-foreground shrink-0 w-14 text-right">{test.tat ? `${test.tat}d` : "-"}</span>
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
              `Register ${totalSampleCount} Sample${totalSampleCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
