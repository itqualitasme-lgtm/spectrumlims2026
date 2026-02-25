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

import { restoreInvoice, permanentDeleteInvoice } from "@/actions/trash"

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceType: string
  client: { name: string; company: string | null }
  createdBy: { name: string }
  subtotal: number
  total: number
  status: string
  deletedAt: string
  createdAt: string
}

export function DeletedInvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function handleRestore(id: string) {
    setLoading(id)
    try {
      await restoreInvoice(id)
      toast.success("Invoice restored successfully")
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
      await permanentDeleteInvoice(deleteId)
      toast.success("Invoice permanently deleted")
      setDeleteId(null)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{row.original.invoiceNumber}</span>
          {row.original.invoiceType === "proforma" && (
            <Badge variant="outline" className="text-xs">Proforma</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "client.name",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => `AED ${row.original.total.toFixed(2)}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status
        const variant =
          s === "paid" ? "default" :
          s === "sent" ? "secondary" :
          "outline"
        return <Badge variant={variant}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>
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
        title="Deleted Invoices"
        description="Restore or permanently delete invoices from the trash."
      />

      <DataTable columns={columns} data={invoices} searchKey="invoiceNumber" />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Permanently Delete Invoice"
        description="This action cannot be undone. The invoice and all its items will be permanently removed from the database."
        onConfirm={handlePermanentDelete}
        loading={!!loading}
        destructive
      />
    </div>
  )
}
