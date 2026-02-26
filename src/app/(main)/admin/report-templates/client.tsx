"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Star } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { deleteReportTemplate } from "@/actions/report-templates"

interface ReportTemplate {
  id: string
  name: string
  headerText: string | null
  footerText: string | null
  logoUrl: string | null
  accreditationLogoUrl: string | null
  accreditationText: string | null
  isoLogoUrl: string | null
  sealUrl: string | null
  showLabLogo: boolean
  isDefault: boolean
  labId: string
  createdAt: string
}

export function ReportTemplatesClient({
  templates,
}: {
  templates: ReportTemplate[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")

  const columns: ColumnDef<ReportTemplate, any>[] = [
    {
      accessorKey: "name",
      header: "Template Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDefault && (
            <Badge variant="default" className="text-xs">
              <Star className="mr-1 h-3 w-3" /> Default
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "headerText",
      header: "Header",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.headerText || "-"}
        </span>
      ),
    },
    {
      id: "logos",
      header: "Logos",
      cell: ({ row }) => {
        const parts = []
        if (row.original.showLabLogo) parts.push("Lab")
        if (row.original.accreditationLogoUrl) parts.push("Accreditation")
        if (row.original.isoLogoUrl) parts.push("ISO")
        if (row.original.sealUrl) parts.push("Seal")
        if (row.original.logoUrl) parts.push("Custom")
        return parts.length > 0 ? (
          <span className="text-sm">{parts.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href={`/admin/report-templates/${row.original.id}/edit`}>
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
      await deleteReportTemplate(deletingId)
      toast.success("Template deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template")
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
        title="Report Templates"
        description="Create and manage report header/footer templates with logos and accreditation marks"
        actionLabel="Add Template"
        actionHref="/admin/report-templates/new"
      />

      <DataTable
        columns={columns}
        data={templates}
        searchPlaceholder="Search templates..."
        searchKey="name"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Template"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
