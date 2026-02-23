"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createSampleType,
  updateSampleType,
  deleteSampleType,
} from "@/actions/sample-types"

interface SampleType {
  id: string
  name: string
  description: string | null
  defaultTests: string
  status: string
  labId: string
  createdAt: string
}

interface FormData {
  name: string
  description: string
  defaultTests: string
  status: string
}

const emptyForm: FormData = {
  name: "",
  description: "",
  defaultTests: "[]",
  status: "active",
}

function getTestsCount(defaultTests: string): number {
  try {
    const parsed = JSON.parse(defaultTests)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

export function SampleTypesClient({
  sampleTypes,
}: {
  sampleTypes: SampleType[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<SampleType | null>(null)

  const columns: ColumnDef<SampleType, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      id: "testsCount",
      header: "Tests Count",
      cell: ({ row }) => getTestsCount(row.original.defaultTests),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "secondary"}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedType(row.original)
                setFormData({
                  name: row.original.name,
                  description: row.original.description || "",
                  defaultTests: formatJson(row.original.defaultTests),
                  status: row.original.status,
                })
                setJsonError(null)
                setEditOpen(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedType(row.original)
                setDeleteOpen(true)
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  function validateAndSubmit(onSubmit: () => void) {
    // Validate JSON
    try {
      JSON.parse(formData.defaultTests)
      setJsonError(null)
    } catch {
      setJsonError("Invalid JSON format. Please check the syntax.")
      return
    }

    if (!formData.name.trim()) {
      toast.error("Sample type name is required")
      return
    }

    onSubmit()
  }

  async function handleCreate() {
    setLoading(true)
    try {
      await createSampleType({
        name: formData.name,
        description: formData.description || undefined,
        defaultTests: formData.defaultTests,
        status: formData.status,
      })
      toast.success("Sample type created successfully")
      setCreateOpen(false)
      setFormData(emptyForm)
      setJsonError(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create sample type")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!selectedType) return

    setLoading(true)
    try {
      await updateSampleType(selectedType.id, {
        name: formData.name,
        description: formData.description || undefined,
        defaultTests: formData.defaultTests,
        status: formData.status,
      })
      toast.success("Sample type updated successfully")
      setEditOpen(false)
      setSelectedType(null)
      setFormData(emptyForm)
      setJsonError(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update sample type")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!selectedType) return

    setLoading(true)
    try {
      await deleteSampleType(selectedType.id)
      toast.success("Sample type deleted successfully")
      setDeleteOpen(false)
      setSelectedType(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete sample type")
    } finally {
      setLoading(false)
    }
  }

  function renderForm(onSubmit: () => void, submitLabel: string) {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Sample type name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Brief description"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="defaultTests">Default Tests (JSON)</Label>
          <p className="text-xs text-muted-foreground">
            Enter a JSON array of test objects. Example:{" "}
            {`[{"parameter": "pH", "unit": "pH", "method": "APHA 4500-H+"}]`}
          </p>
          <Textarea
            id="defaultTests"
            value={formData.defaultTests}
            onChange={(e) => {
              setFormData({ ...formData, defaultTests: e.target.value })
              setJsonError(null)
            }}
            placeholder='[{"parameter": "pH", "unit": "pH", "method": "APHA 4500-H+"}]'
            className="min-h-[120px] font-mono text-sm"
          />
          {jsonError && (
            <p className="text-sm text-destructive">{jsonError}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            onClick={() => validateAndSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Types"
        description="Manage sample type definitions and default tests"
        actionLabel="Add Sample Type"
        onAction={() => {
          setFormData(emptyForm)
          setJsonError(null)
          setCreateOpen(true)
        }}
      />

      <DataTable
        columns={columns}
        data={sampleTypes}
        searchPlaceholder="Search sample types..."
        searchKey="name"
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Sample Type</DialogTitle>
          </DialogHeader>
          {renderForm(handleCreate, "Create Sample Type")}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sample Type</DialogTitle>
          </DialogHeader>
          {renderForm(handleUpdate, "Update Sample Type")}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Sample Type"
        description={`Are you sure you want to delete "${selectedType?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
