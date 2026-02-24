"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

type Collection = {
  id: string
  sampleNumber: string
  description: string | null
  quantity: string | null
  priority: string
  status: string
  collectionLocation: string | null
  createdAt: string
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
}

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
    case "reported":
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Reported</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "normal":
      return <Badge variant="secondary">Normal</Badge>
    case "urgent":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Urgent</Badge>
    case "rush":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rush</Badge>
    default:
      return <Badge variant="secondary">{priority}</Badge>
  }
}

export function SampleCollectionClient({
  collections,
  customers,
  sampleTypes,
}: {
  collections: Collection[]
  customers: Customer[]
  sampleTypes: SampleTypeOption[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [clientId, setClientId] = useState("")
  const [sampleTypeId, setSampleTypeId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [collectionLocation, setCollectionLocation] = useState("")
  const [samplePoint, setSamplePoint] = useState("")
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState("normal")

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.company ? `${c.name} - ${c.company}` : c.name,
  }))

  const sampleTypeOptions = sampleTypes.map((st) => ({
    value: st.id,
    label: st.name,
  }))

  const resetForm = () => {
    setClientId("")
    setSampleTypeId("")
    setQuantity("")
    setCollectionLocation("")
    setSamplePoint("")
    setDescription("")
    setNotes("")
    setPriority("normal")
  }

  const handleSubmit = async () => {
    if (!clientId || !sampleTypeId) {
      toast.error("Please select a customer and sample type")
      return
    }

    setLoading(true)
    try {
      const sample = await createSample({
        clientId,
        sampleTypeId,
        description: description || undefined,
        quantity: quantity || undefined,
        priority,
        notes: notes || undefined,
        collectedByCurrentUser: true,
        collectionLocation: collectionLocation || undefined,
        samplePoint: samplePoint || undefined,
      })
      toast.success(`Sample ${sample.sampleNumber} collected and registered`)
      resetForm()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to register collection")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Collection, any>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.sampleNumber}</span>
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      accessorKey: "sampleType.name",
      header: "Type",
    },
    {
      accessorKey: "collectionLocation",
      header: "Location",
      cell: ({ row }) => row.original.collectionLocation || "-",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => priorityBadge(row.original.priority),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Collection"
        description="Collect and register samples from client sites"
      />

      {/* New Collection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            New Collection
          </CardTitle>
          <CardDescription>
            Record a new sample collection
          </CardDescription>
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
                  onValueChange={setSampleTypeId}
                  placeholder="Select a sample type..."
                  searchPlaceholder="Search sample types..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500ml, 1L"
                />
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
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
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sample description..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Collection notes..."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Collection"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Collections</CardTitle>
          <CardDescription>
            Samples you have collected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={collections}
            searchPlaceholder="Search collections..."
            searchKey="sampleNumber"
          />
        </CardContent>
      </Card>
    </div>
  )
}
