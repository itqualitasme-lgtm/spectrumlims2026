"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Pencil, Trash2 } from "lucide-react"
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SampleType | null>(null)
  const [loading, setLoading] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")
  const [statusValue, setStatusValue] = useState("active")

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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditingItem(row.original)
              setStatusValue(row.original.status)
              setJsonError(null)
              setDialogOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => {
              setDeletingId(row.original.id)
              setDeletingName(row.original.name)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string)?.trim()
    const description = formData.get("description") as string
    const defaultTests = formData.get("defaultTests") as string

    if (!name) {
      toast.error("Sample type name is required")
      return
    }

    try {
      JSON.parse(defaultTests)
      setJsonError(null)
    } catch {
      setJsonError("Invalid JSON format. Please check the syntax.")
      return
    }

    setLoading(true)
    try {
      if (editingItem) {
        await updateSampleType(editingItem.id, {
          name,
          description: description || undefined,
          defaultTests,
          status: statusValue,
        })
        toast.success("Sample type updated successfully")
      } else {
        await createSampleType({
          name,
          description: description || undefined,
          defaultTests,
          status: statusValue,
        })
        toast.success("Sample type created successfully")
      }
      setDialogOpen(false)
      setEditingItem(null)
      setJsonError(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save sample type")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return

    setLoading(true)
    try {
      await deleteSampleType(deletingId)
      toast.success("Sample type deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete sample type")
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
      setDeletingId(null)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Types"
        description="Manage sample type definitions and default tests"
        actionLabel="Add Sample Type"
        onAction={() => {
          setEditingItem(null)
          setStatusValue("active")
          setJsonError(null)
          setDialogOpen(true)
        }}
      />

      <DataTable
        columns={columns}
        data={sampleTypes}
        searchPlaceholder="Search sample types..."
        searchKey="name"
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) { setEditingItem(null); setJsonError(null) }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Sample Type" : "Add Sample Type"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update sample type details below."
                : "Fill in the sample type details below."}
            </DialogDescription>
          </DialogHeader>
          <form key={editingItem?.id || "create"} onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name || ""}
                  placeholder="Sample type name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  name="description"
                  defaultValue={editingItem?.description || ""}
                  placeholder="Brief description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Default Tests (JSON)</Label>
                <p className="text-xs text-muted-foreground">
                  Enter a JSON array of test objects. Example:{" "}
                  {`[{"parameter": "pH", "unit": "pH", "method": "APHA 4500-H+"}]`}
                </p>
                <Textarea
                  name="defaultTests"
                  defaultValue={editingItem ? formatJson(editingItem.defaultTests) : "[]"}
                  placeholder='[{"parameter": "pH", "unit": "pH", "method": "APHA 4500-H+"}]'
                  className="min-h-[120px] font-mono text-sm"
                  onChange={() => setJsonError(null)}
                />
                {jsonError && (
                  <p className="text-sm text-destructive">{jsonError}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={setStatusValue}
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
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingItem
                    ? "Update Sample Type"
                    : "Create Sample Type"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Sample Type"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
