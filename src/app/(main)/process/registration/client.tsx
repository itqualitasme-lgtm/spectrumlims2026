"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { Eye, UserPlus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

const jobTypeBadge = (jobType: string) => {
  switch (jobType) {
    case "testing":
      return <Badge variant="outline">Testing</Badge>
    case "survey":
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Survey</Badge>
    default:
      return <Badge variant="secondary">{jobType}</Badge>
  }
}

export function RegistrationClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()

  // Dialog states
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected sample for assign/delete
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  // Assign form
  const [chemists, setChemists] = useState<{ value: string; label: string }[]>([])
  const [assignedToId, setAssignedToId] = useState("")

  const handleOpenAssign = async (sample: Sample) => {
    try {
      const ch = await getChemistsForSelect()
      setChemists(ch.map((x) => ({ value: x.id, label: x.name })))
      setSelectedSample(sample)
      setAssignedToId("")
      setAssignOpen(true)
    } catch {
      toast.error("Failed to load chemists")
    }
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
      accessorKey: "jobType",
      header: "Job Type",
      cell: ({ row }) => jobTypeBadge(row.original.jobType),
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              asChild
            >
              <Link href={`/process/registration/${sample.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {["pending", "registered"].includes(sample.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleOpenAssign(sample)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
            {["pending", "registered"].includes(sample.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={() => {
                  setSelectedSample(sample)
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
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
        actionHref="/process/registration/new"
      />

      <DataTable
        columns={columns}
        data={samples}
        searchPlaceholder="Search samples..."
        searchKey="sampleNumber"
      />

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
