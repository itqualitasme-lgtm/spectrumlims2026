"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { deleteSampleType } from "@/actions/sample-types"
import Link from "next/link"

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

export function SampleTypesClient({
  sampleTypes,
}: {
  sampleTypes: SampleType[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")

  const columns: ColumnDef<SampleType, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/masters/sample-types/${row.original.id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      id: "testsCount",
      header: "Parameters",
      cell: ({ row }) => {
        const count = getTestsCount(row.original.defaultTests)
        return count > 0 ? (
          <Badge variant="secondary">{count}</Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )
      },
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
            asChild
          >
            <Link href={`/masters/sample-types/${row.original.id}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
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
        description="Manage sample type definitions and test parameters"
        actionLabel="Add Sample Type"
        actionHref="/masters/sample-types/new"
      />

      <DataTable
        columns={columns}
        data={sampleTypes}
        searchPlaceholder="Search sample types..."
        searchKey="name"
      />

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
