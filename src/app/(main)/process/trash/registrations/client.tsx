"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { RotateCcw, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { restoreSample, permanentDeleteSample } from "@/actions/trash"

interface Sample {
  id: string
  sampleNumber: string
  client: { name: string; company: string | null }
  sampleType: { name: string }
  status: string
  priority: string
  deletedAt: string
  createdAt: string
}

export function DeletedRegistrationsClient({ samples }: { samples: Sample[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function handleRestore(id: string) {
    setLoading(id)
    try {
      await restoreSample(id)
      toast.success("Sample restored successfully")
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handlePermanentDelete() {
    if (!deleteId) return
    setLoading(deleteId)
    try {
      await permanentDeleteSample(deleteId)
      toast.success("Sample permanently deleted")
      setDeleteId(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  const columns: ColumnDef<Sample>[] = [
    {
      accessorKey: "sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.sampleNumber}</span>
      ),
    },
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      accessorKey: "sampleType.name",
      header: "Sample Type",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const variant =
          s === "completed" || s === "reported" ? "default" :
          s === "testing" ? "secondary" :
          "outline"
        return <Badge variant={variant}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const p = row.original.priority
        const variant =
          p === "urgent" ? "destructive" :
          p === "high" ? "default" :
          "outline"
        return <Badge variant={variant}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>
      },
    },
    {
      accessorKey: "deletedAt",
      header: "Deleted On",
      cell: ({ row }) =>
        row.original.deletedAt
          ? format(new Date(row.original.deletedAt), "dd MMM yyyy HH:mm")
          : "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <TooltipProvider>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRestore(row.original.id)}
                  disabled={loading === row.original.id}
                >
                  {loading === row.original.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeleteId(row.original.id)}
                  disabled={loading === row.original.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Permanent Delete</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deleted Registrations"
        description="Restore or permanently delete sample registrations from the trash."
      />

      <DataTable columns={columns} data={samples} searchKey="sampleNumber" />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Permanently Delete Sample"
        description="This action cannot be undone. The sample registration and all its test results will be permanently removed from the database."
        onConfirm={handlePermanentDelete}
        loading={!!loading}
        destructive
      />
    </div>
  )
}
