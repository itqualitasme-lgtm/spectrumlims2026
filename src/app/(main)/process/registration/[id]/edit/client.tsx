"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { AsyncSearchableSelect } from "@/components/shared/async-searchable-select"
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
import { Textarea } from "@/components/ui/textarea"

import { updateSample, searchCustomers, getCustomerById } from "@/actions/registrations"

type SampleTypeOption = {
  id: string
  name: string
  defaultTests: string
}

type Sampler = {
  id: string
  name: string
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
}

const BOTTLE_SIZES = [
  { value: "1 Ltr", label: "1 Ltr" },
  { value: "500 Ml", label: "500 Ml" },
  { value: "300 Ml", label: "300 Ml" },
]

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

  const samplerOptions = useMemo(
    () => samplers.map((s) => ({ value: s.id, label: s.name })),
    [samplers]
  )

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
        collectedById: collectedById || undefined,
        collectionLocation: collectionLocation || undefined,
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/process/registration/${sample.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <PageHeader title={`Edit ${sample.sampleNumber}`} />
      </div>

      {/* Job Details */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-2">
            {/* Row 1 */}
            <div className="col-span-2 grid gap-0.5">
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
              <Select value={jobType} onValueChange={setJobType}>
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
                <Input className="h-9 flex-1" type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
                <Input className="h-9 w-[120px]" type="time" value={collectionTime} onChange={(e) => setCollectionTime(e.target.value)} />
              </div>
            </div>
            {/* Row 2 */}
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Reference / PO</Label>
              <Input className="h-9" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number" />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input className="h-9" value={collectionLocation} onChange={(e) => setCollectionLocation(e.target.value)} placeholder="e.g. Ajman Port" />
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
              <Textarea className="min-h-[60px] text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
            </div>
          </div>
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
    </div>
  )
}
