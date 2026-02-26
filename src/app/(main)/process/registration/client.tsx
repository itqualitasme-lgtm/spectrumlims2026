"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Eye, UserPlus, Loader2, QrCode, Printer, Search } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
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
  getChemistsForSelect,
} from "@/actions/registrations"

type RegistrationRow = {
  id: string
  registrationNumber: string
  client: { id: string; name: string; company: string | null }
  sampleTypes: string
  sampleCount: number
  priority: string
  jobType: string
  collectionLocation: string | null
  assignedTo: string | null
  status: string
  createdAt: string
  samples: { id: string; sampleNumber: string; status: string }[]
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
    case "mixed":
      return <Badge variant="secondary">Mixed</Badge>
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

export function RegistrationClient({ registrations }: { registrations: RegistrationRow[] }) {
  const router = useRouter()

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [loading, setLoading] = useState(false)

  // Batch assign
  const [batchAssignOpen, setBatchAssignOpen] = useState(false)
  const [batchAssignToId, setBatchAssignToId] = useState("")
  const [chemists, setChemists] = useState<{ value: string; label: string }[]>([])

  const filteredRegistrations = useMemo(() => {
    let result = registrations
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter || r.samples.some((s) => s.status === statusFilter))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.client.name.toLowerCase().includes(q) ||
        (r.client.company && r.client.company.toLowerCase().includes(q)) ||
        r.sampleTypes.toLowerCase().includes(q) ||
        (r.collectionLocation && r.collectionLocation.toLowerCase().includes(q))
      )
    }
    return result
  }, [registrations, statusFilter, searchQuery])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRegistrations.map((r) => r.id)))
    }
  }

  const selectedRegs = filteredRegistrations.filter((r) => selectedIds.has(r.id))

  const handleBatchPrintLabels = () => {
    if (selectedIds.size === 0) {
      toast.error("No registrations selected")
      return
    }
    // Collect all sample IDs from selected registrations
    const ids = selectedRegs.flatMap((r) => r.samples.map((s) => s.id)).join(",")
    window.open(`/api/samples/labels?ids=${ids}`, "_blank")
  }

  const handleOpenBatchAssign = async () => {
    const assignableRegs = selectedRegs.filter((r) =>
      r.samples.some((s) => ["pending", "registered"].includes(s.status))
    )
    if (assignableRegs.length === 0) {
      toast.error("No selected registrations have assignable samples")
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
      const assignableSamples = selectedRegs.flatMap((r) =>
        r.samples.filter((s) => ["pending", "registered"].includes(s.status))
      )
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

  const columns: ColumnDef<RegistrationRow, any>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={filteredRegistrations.length > 0 && selectedIds.size === filteredRegistrations.length}
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
      accessorKey: "registrationNumber",
      header: "Reg #",
      cell: ({ row }) => (
        <Link
          href={`/process/registration/${row.original.samples[0]?.id || row.original.id}`}
          className="font-medium text-primary hover:underline font-mono text-xs"
        >
          {row.original.registrationNumber}
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
      accessorKey: "sampleTypes",
      header: "Type",
    },
    {
      accessorKey: "sampleCount",
      header: "Qty",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original.sampleCount}
        </Badge>
      ),
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
      accessorKey: "assignedTo",
      header: "Assigned To",
      cell: ({ row }) => row.original.assignedTo || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
      sortingFn: (rowA, rowB) => {
        const order = ["registered", "assigned", "testing", "completed", "reported", "mixed"]
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
        const reg = row.original
        return (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              asChild
            >
              <Link href={`/process/registration/${reg.samples[0]?.id || reg.id}`}>
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const ids = reg.samples.map((s) => s.id).join(",")
                window.open(`/api/samples/labels?ids=${ids}`, "_blank")
              }}
              title="Print QR Labels"
            >
              <QrCode className="h-3.5 w-3.5" />
            </Button>
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
            placeholder="Search registrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-[240px] text-xs"
          />
          {(statusFilter !== "all" || searchQuery.trim()) && (
            <Badge variant="secondary" className="text-xs">
              {filteredRegistrations.length} registration{filteredRegistrations.length !== 1 ? "s" : ""}
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleOpenBatchAssign}
            >
              <UserPlus className="mr-1 h-3 w-3" />
              Assign
            </Button>
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
        data={filteredRegistrations}
        hideSearch
      />

      {/* Batch Assign Dialog */}
      <Dialog open={batchAssignOpen} onOpenChange={setBatchAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Batch Assign Samples</DialogTitle>
            <DialogDescription>
              Assign all samples from {selectedIds.size} registration(s) to a chemist.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
