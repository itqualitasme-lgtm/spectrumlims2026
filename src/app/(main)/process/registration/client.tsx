"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Eye, Pencil, UserPlus, Trash2, Loader2, QrCode, Printer, Search } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  assignSample,
  deleteSample,
  getChemistsForSelect,
} from "@/actions/registrations"

type Sample = {
  id: string
  sampleNumber: string
  description: string | null
  quantity: string | null
  priority: string
  status: string
  jobType: string
  notes: string | null
  collectionLocation: string | null
  createdAt: string
  client: { id: string; name: string; company: string | null }
  sampleType: { id: string; name: string }
  assignedTo: { name: string } | null
  collectedBy: { name: string } | null
  registeredBy: { name: string } | null
  registration: { id: string; registrationNumber: string } | null
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "registered", label: "Registered" },
  { value: "assigned", label: "Assigned" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
  { value: "reported", label: "Reported" },
]

export function RegistrationClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected sample for assign/delete
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  // Assign form
  const [chemists, setChemists] = useState<{ value: string; label: string }[]>([])
  const [assignedToId, setAssignedToId] = useState("")

  // Batch assign
  const [batchAssignOpen, setBatchAssignOpen] = useState(false)
  const [batchAssignToId, setBatchAssignToId] = useState("")

  const filteredSamples = useMemo(() => {
    let result = samples
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) =>
        s.sampleNumber.toLowerCase().includes(q) ||
        s.client.name.toLowerCase().includes(q) ||
        (s.client.company && s.client.company.toLowerCase().includes(q)) ||
        s.sampleType.name.toLowerCase().includes(q) ||
        (s.collectionLocation && s.collectionLocation.toLowerCase().includes(q))
      )
    }
    return result
  }, [samples, statusFilter, searchQuery])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSamples.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredSamples.map((s) => s.id)))
    }
  }

  const selectedSamples = filteredSamples.filter((s) => selectedIds.has(s.id))
  const assignableSamples = selectedSamples.filter((s) =>
    ["pending", "registered"].includes(s.status)
  )

  const handleOpenAssign = async (sample: Sample) => {
    try {
      const ch = await getChemistsForSelect()
      setChemists([
        { value: "public", label: "Public (All Chemists)" },
        ...ch.map((x) => ({ value: x.id, label: x.name })),
      ])
      setSelectedSample(sample)
      setAssignedToId("public")
      setAssignOpen(true)
    } catch {
      toast.error("Failed to load chemists")
    }
  }

  const handleAssign = async () => {
    if (!selectedSample || !assignedToId) {
      toast.error("Please select an option")
      return
    }

    setLoading(true)
    try {
      await assignSample(selectedSample.id, assignedToId === "public" ? null : assignedToId)
      const label = assignedToId === "public" ? "public (all chemists)" : "chemist"
      toast.success(`Sample ${selectedSample.sampleNumber} assigned to ${label}`)
      setAssignOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign sample")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenBatchAssign = async () => {
    if (assignableSamples.length === 0) {
      toast.error("No selected samples can be assigned (must be pending or registered)")
      return
    }
    try {
      const ch = await getChemistsForSelect()
      setChemists([
        { value: "public", label: "Public (All Chemists)" },
        ...ch.map((x) => ({ value: x.id, label: x.name })),
      ])
      setBatchAssignToId("public")
      setBatchAssignOpen(true)
    } catch {
      toast.error("Failed to load chemists")
    }
  }

  const handleBatchAssign = async () => {
    if (!batchAssignToId) {
      toast.error("Please select an option")
      return
    }

    setLoading(true)
    try {
      for (const s of assignableSamples) {
        await assignSample(s.id, batchAssignToId === "public" ? null : batchAssignToId)
      }
      toast.success(`${assignableSamples.length} sample(s) assigned successfully`)
      setBatchAssignOpen(false)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign samples")
    } finally {
      setLoading(false)
    }
  }

  const handleBatchPrintLabels = () => {
    if (selectedIds.size === 0) {
      toast.error("No samples selected")
      return
    }
    const ids = Array.from(selectedIds).join(",")
    window.open(`/api/samples/labels?ids=${ids}`, "_blank")
  }

  const handleDelete = async () => {
    if (!selectedSample) return

    setLoading(true)
    try {
      await deleteSample(selectedSample.id)
      toast.success(`Sample ${selectedSample.sampleNumber} deleted`)
      setDeleteOpen(false)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(selectedSample.id)
        return next
      })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete sample")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Sample, any>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={filteredSamples.length > 0 && selectedIds.size === filteredSamples.length}
          onCheckedChange={toggleSelectAll}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          className="h-4 w-4"
        />
      ),
      enableSorting: false,
    },
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
      id: "registrationNumber",
      header: "Reg #",
      cell: ({ row }) => {
        const reg = row.original.registration
        return reg ? (
          <span className="text-xs text-muted-foreground font-mono">{reg.registrationNumber}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      },
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
      accessorKey: "collectionLocation",
      header: "Location",
      cell: ({ row }) => row.original.collectionLocation || "-",
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
      sortingFn: (rowA, rowB) => {
        const order = ["registered", "assigned", "testing", "completed", "reported"]
        return order.indexOf(rowA.original.status) - order.indexOf(rowB.original.status)
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const sample = row.original
        return (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              asChild
            >
              <Link href={`/process/registration/${sample.id}`}>
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {["pending", "registered", "assigned"].includes(sample.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                asChild
              >
                <Link href={`/process/registration/${sample.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => window.open(`/api/samples/${sample.id}/label`, "_blank")}
              title="Print QR Label"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
            {["pending", "registered"].includes(sample.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleOpenAssign(sample)}
                title="Assign to chemist"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            )}
            {["pending", "registered"].includes(sample.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  setSelectedSample(sample)
                  setDeleteOpen(true)
                }}
                title="Delete sample"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sample Registration"
        description="Register and manage laboratory samples"
        actionLabel="Register Sample"
        actionHref="/process/registration/new"
      />

      {/* Filters & Batch Actions Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search samples..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-[240px] text-xs"
          />
          {(statusFilter !== "all" || searchQuery.trim()) && (
            <Badge variant="secondary" className="text-xs">
              {filteredSamples.length} sample{filteredSamples.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleBatchPrintLabels}
            >
              <Printer className="mr-1 h-3 w-3" />
              Print Labels
            </Button>
            {assignableSamples.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleOpenBatchAssign}
              >
                <UserPlus className="mr-1 h-3 w-3" />
                Assign ({assignableSamples.length})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredSamples}
        hideSearch
      />

      {/* Single Assign Dialog */}
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

      {/* Batch Assign Dialog */}
      <Dialog open={batchAssignOpen} onOpenChange={setBatchAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Batch Assign Samples</DialogTitle>
            <DialogDescription>
              Assign {assignableSamples.length} sample(s) to a chemist for testing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-xs text-muted-foreground">
              Samples: {assignableSamples.map((s) => s.sampleNumber).join(", ")}
            </div>
            <div className="grid gap-2">
              <Label>Assign To *</Label>
              <SearchableSelect
                options={chemists}
                value={batchAssignToId}
                onValueChange={setBatchAssignToId}
                placeholder="Select a chemist..."
                searchPlaceholder="Search chemists..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchAssignOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBatchAssign} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign ${assignableSamples.length} Sample(s)`
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
