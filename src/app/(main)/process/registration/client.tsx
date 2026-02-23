"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, UserPlus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  createSample,
  assignSample,
  deleteSample,
  getCustomersForSelect,
  getSampleTypesForSelect,
  getChemistsForSelect,
} from "@/actions/registrations"

type Sample = {
  id: string
  sampleNumber: string
  description: string | null
  quantity: string | null
  priority: string
  status: string
  notes: string | null
  createdAt: string
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
  collectedBy: { name: string } | null
  registeredBy: { name: string } | null
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

export function RegistrationClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()

  // Dialog states
  const [registerOpen, setRegisterOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected sample for assign/delete
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  // Select options
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [sampleTypes, setSampleTypes] = useState<{ value: string; label: string }[]>([])
  const [chemists, setChemists] = useState<{ value: string; label: string }[]>([])

  // Register form
  const [clientId, setClientId] = useState("")
  const [sampleTypeId, setSampleTypeId] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("")
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")

  // Assign form
  const [assignedToId, setAssignedToId] = useState("")

  const loadSelectOptions = async () => {
    try {
      const [c, st, ch] = await Promise.all([
        getCustomersForSelect(),
        getSampleTypesForSelect(),
        getChemistsForSelect(),
      ])
      setCustomers(
        c.map((x) => ({
          value: x.id,
          label: x.company ? `${x.name} - ${x.company}` : x.name,
        }))
      )
      setSampleTypes(st.map((x) => ({ value: x.id, label: x.name })))
      setChemists(ch.map((x) => ({ value: x.id, label: x.name })))
    } catch {
      toast.error("Failed to load form options")
    }
  }

  const handleOpenRegister = async () => {
    await loadSelectOptions()
    setClientId("")
    setSampleTypeId("")
    setDescription("")
    setQuantity("")
    setPriority("normal")
    setNotes("")
    setRegisterOpen(true)
  }

  const handleRegister = async () => {
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
      })
      toast.success(`Sample ${sample.sampleNumber} registered successfully`)
      setRegisterOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to register sample")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAssign = async (sample: Sample) => {
    await loadSelectOptions()
    setSelectedSample(sample)
    setAssignedToId("")
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedSample || !assignedToId) {
      toast.error("Please select a chemist")
      return
    }

    setLoading(true)
    try {
      await assignSample(selectedSample.id, assignedToId)
      toast.success(`Sample ${selectedSample.sampleNumber} assigned successfully`)
      setAssignOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign sample")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSample) return

    setLoading(true)
    try {
      await deleteSample(selectedSample.id)
      toast.success(`Sample ${selectedSample.sampleNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete sample")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Sample, any>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <Link
          href={`/process/registration/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.sampleNumber}
        </Link>
      ),
    },
    {
      accessorKey: "client.company",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      accessorKey: "sampleType.name",
      header: "Type",
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => priorityBadge(row.original.priority),
    },
    {
      accessorKey: "assignedTo.name",
      header: "Assigned To",
      cell: ({ row }) => row.original.assignedTo?.name || "-",
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const sample = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/process/registration/${sample.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              {["pending", "registered"].includes(sample.status) && (
                <DropdownMenuItem onClick={() => handleOpenAssign(sample)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </DropdownMenuItem>
              )}
              {["pending", "registered"].includes(sample.status) && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setSelectedSample(sample)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Registration"
        description="Register and manage laboratory samples"
        actionLabel="Register Sample"
        onAction={handleOpenRegister}
      />

      <DataTable
        columns={columns}
        data={samples}
        searchPlaceholder="Search samples..."
        searchKey="sampleNumber"
      />

      {/* Register Sample Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Sample</DialogTitle>
            <DialogDescription>
              Enter the sample details to register a new sample.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Customer *</Label>
              <SearchableSelect
                options={customers}
                value={clientId}
                onValueChange={setClientId}
                placeholder="Select a customer..."
                searchPlaceholder="Search customers..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Sample Type *</Label>
              <SearchableSelect
                options={sampleTypes}
                value={sampleTypeId}
                onValueChange={setSampleTypeId}
                placeholder="Select a sample type..."
                searchPlaceholder="Search sample types..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sample description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500ml"
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
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Sample"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Sample Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Sample</DialogTitle>
            <DialogDescription>
              Assign {selectedSample?.sampleNumber} to a chemist for testing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Assign To *</Label>
              <SearchableSelect
                options={chemists}
                value={assignedToId}
                onValueChange={setAssignedToId}
                placeholder="Select a chemist..."
                searchPlaceholder="Search chemists..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Sample"
        description={`Are you sure you want to delete sample ${selectedSample?.sampleNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
