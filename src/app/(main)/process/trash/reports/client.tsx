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

import { restoreReport, permanentDeleteReport } from "@/actions/trash"

interface Report {
  id: string
  reportNumber: string
  status: string
  sample: {
    sampleNumber: string
    client: { name: string; company: string | null }
    sampleType: { name: string }
  }
  createdBy: { name: string }
  deletedAt: string
  deletedByName: string | null
  createdAt: string
}

export function DeletedReportsClient({ reports }: { reports: Report[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function handleRestore(id: string) {
    setLoading(id)
    try {
      await restoreReport(id)
      toast.success("Report restored successfully")
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
      await permanentDeleteReport(deleteId)
      toast.success("Report permanently deleted")
      setDeleteId(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  const columns: ColumnDef<Report>[] = [
    {
      accessorKey: "reportNumber",
      header: "Report #",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.reportNumber}</span>
      ),
    },
    {
      accessorKey: "sample.sampleNumber",
      header: "Sample #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.sample.sampleNumber}</span>
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.sample.client.company || row.original.sample.client.name,
    },
    {
      id: "sampleType",
      header: "Sample Type",
      cell: ({ row }) => row.original.sample.sampleType.name,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const variant =
          s === "published" ? "default" :
          s === "approved" ? "secondary" :
          "outline"
        return <Badge variant={variant}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>
      },
    },
    {
      accessorKey: "createdBy.name",
      header: "Created By",
    },
    {
      accessorKey: "deletedByName",
      header: "Deleted By",
      cell: ({ row }) => row.original.deletedByName || "-",
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
        title="Deleted Reports"
        description="Restore or permanently delete reports from the trash."
      />

      <DataTable columns={columns} data={reports} searchKey="reportNumber" />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Permanently Delete Report"
        description="This action cannot be undone. The report and its verifications will be permanently removed from the database."
        onConfirm={handlePermanentDelete}
        loading={!!loading}
        destructive
      />
    </div>
  )
}
