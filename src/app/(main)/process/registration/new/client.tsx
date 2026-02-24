"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ClipboardList } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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

import { createSample } from "@/actions/registrations"

type Customer = {
  id: string
  name: string
  company: string | null
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

type TestParam = {
  parameter: string
  testMethod?: string
  unit?: string
  specMin?: string
  specMax?: string
}

export function NewRegistrationClient({
  customers,
  sampleTypes,
  samplers,
}: {
  customers: Customer[]
  sampleTypes: SampleTypeOption[]
  samplers: Sampler[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [clientId, setClientId] = useState("")
  const [sampleTypeId, setSampleTypeId] = useState("")
  const [jobType, setJobType] = useState("testing")
  const [priority, setPriority] = useState("normal")
  const [reference, setReference] = useState("")
  const [description, setDescription] = useState("")
  const [collectedById, setCollectedById] = useState("")
  const [samplePoint, setSamplePoint] = useState("")
  const [collectionLocation, setCollectionLocation] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")

  // Test selection
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set())

  // Build select options
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.company ? `${c.name} - ${c.company}` : c.name,
      })),
    [customers]
  )

  const sampleTypeOptions = useMemo(
    () => sampleTypes.map((st) => ({ value: st.id, label: st.name })),
    [sampleTypes]
  )

  const samplerOptions = useMemo(
    () => samplers.map((s) => ({ value: s.id, label: s.name })),
    [samplers]
  )

  // Parse tests from selected sample type
  const availableTests: TestParam[] = useMemo(() => {
    if (!sampleTypeId) return []
    const st = sampleTypes.find((s) => s.id === sampleTypeId)
    if (!st?.defaultTests) return []
    try {
      const parsed = JSON.parse(st.defaultTests)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [sampleTypeId, sampleTypes])

  // When sample type changes, select all tests by default
  const handleSampleTypeChange = (value: string) => {
    setSampleTypeId(value)
    const st = sampleTypes.find((s) => s.id === value)
    if (st?.defaultTests) {
      try {
        const parsed = JSON.parse(st.defaultTests)
        if (Array.isArray(parsed)) {
          setSelectedTests(new Set(parsed.map((_: any, i: number) => i)))
          return
        }
      } catch {}
    }
    setSelectedTests(new Set())
  }

  const toggleTest = (index: number) => {
    setSelectedTests((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleAllTests = () => {
    if (selectedTests.size === availableTests.length) {
      setSelectedTests(new Set())
    } else {
      setSelectedTests(new Set(availableTests.map((_, i) => i)))
    }
  }

  const resetForm = () => {
    setClientId("")
    setSampleTypeId("")
    setJobType("testing")
    setPriority("normal")
    setReference("")
    setDescription("")
    setCollectedById("")
    setSamplePoint("")
    setCollectionLocation("")
    setQuantity("")
    setNotes("")
    setSelectedTests(new Set())
  }

  const handleSubmit = async () => {
    if (!clientId || !sampleTypeId) {
      toast.error("Please select a customer and sample type")
      return
    }

    if (availableTests.length > 0 && selectedTests.size === 0) {
      toast.error("Please select at least one test parameter")
      return
    }

    setLoading(true)
    try {
      const sample = await createSample({
        clientId,
        sampleTypeId,
        jobType,
        priority,
        reference: reference || undefined,
        description: description || undefined,
        collectedById: collectedById || undefined,
        samplePoint: samplePoint || undefined,
        collectionLocation: collectionLocation || undefined,
        quantity: quantity || undefined,
        notes: notes || undefined,
        selectedTests: availableTests.length > 0 ? Array.from(selectedTests) : undefined,
      })
      toast.success(`Sample ${sample.sampleNumber} registered successfully`)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "Failed to register sample")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/process/registration">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <PageHeader title="Register New Sample" />
      </div>

      {/* Card 1: Sample Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Information</CardTitle>
          <CardDescription>Basic details about the sample being registered</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Customer *</Label>
                <SearchableSelect
                  options={customerOptions}
                  value={clientId}
                  onValueChange={setClientId}
                  placeholder="Select a customer..."
                  searchPlaceholder="Search customers..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Sample Type *</Label>
                <SearchableSelect
                  options={sampleTypeOptions}
                  value={sampleTypeId}
                  onValueChange={handleSampleTypeChange}
                  placeholder="Select a sample type..."
                  searchPlaceholder="Search sample types..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Job Type *</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="rush">Rush</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reference / PO</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Client reference or PO number"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sample description..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Collection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Details</CardTitle>
          <CardDescription>Sample collection and sampler information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Collected By (Sampler)</Label>
                <SearchableSelect
                  options={samplerOptions}
                  value={collectedById}
                  onValueChange={setCollectedById}
                  placeholder="Select a sampler..."
                  searchPlaceholder="Search samplers..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500ml, 1L"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sample Point</Label>
                <Input
                  value={samplePoint}
                  onChange={(e) => setSamplePoint(e.target.value)}
                  placeholder="e.g. Tank No-4, Engine Room, Storage Vessel"
                />
              </div>
              <div className="grid gap-2">
                <Label>Collection Location</Label>
                <Input
                  value={collectionLocation}
                  onChange={(e) => setCollectionLocation(e.target.value)}
                  placeholder="e.g. Site A, Block 3, Ajman Port"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Test Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Test Parameters
              </CardTitle>
              <CardDescription>
                {sampleTypeId
                  ? `${selectedTests.size} of ${availableTests.length} test(s) selected`
                  : "Select a sample type to see available tests"}
              </CardDescription>
            </div>
            {availableTests.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleAllTests}>
                {selectedTests.size === availableTests.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {availableTests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Spec Min</TableHead>
                    <TableHead>Spec Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTests.map((test, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer"
                      onClick={() => toggleTest(index)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTests.has(index)}
                          onCheckedChange={() => toggleTest(index)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{test.parameter}</TableCell>
                      <TableCell>{test.testMethod || "-"}</TableCell>
                      <TableCell>{test.unit || "-"}</TableCell>
                      <TableCell>{test.specMin || "-"}</TableCell>
                      <TableCell>{test.specMax || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {sampleTypeId
                ? "No default tests defined for this sample type."
                : "Select a sample type above to load test parameters."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or special instructions..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" asChild>
          <Link href="/process/registration">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering...
            </>
          ) : (
            "Register Sample"
          )}
        </Button>
      </div>
    </div>
  )
}
