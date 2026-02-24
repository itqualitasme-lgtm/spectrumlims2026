"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Pencil, Trash2, Loader2, Star } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { ImageUpload } from "@/components/shared/image-upload"
import {
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
} from "@/actions/report-templates"

interface ReportTemplate {
  id: string
  name: string
  headerText: string | null
  footerText: string | null
  logoUrl: string | null
  accreditationLogoUrl: string | null
  accreditationText: string | null
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ReportTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formHeaderText, setFormHeaderText] = useState("")
  const [formFooterText, setFormFooterText] = useState("")
  const [formLogoUrl, setFormLogoUrl] = useState("")
  const [formAccreditationLogoUrl, setFormAccreditationLogoUrl] = useState("")
  const [formAccreditationText, setFormAccreditationText] = useState("")
  const [formShowLabLogo, setFormShowLabLogo] = useState(true)
  const [formIsDefault, setFormIsDefault] = useState(false)

  const openCreate = () => {
    setEditingItem(null)
    setFormName("")
    setFormHeaderText("")
    setFormFooterText("This report shall not be reproduced except in full, without the written approval of the laboratory.\nThe results relate only to the items tested.")
    setFormLogoUrl("")
    setFormAccreditationLogoUrl("")
    setFormAccreditationText("")
    setFormShowLabLogo(true)
    setFormIsDefault(templates.length === 0)
    setDialogOpen(true)
  }

  const openEdit = (item: ReportTemplate) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormHeaderText(item.headerText || "")
    setFormFooterText(item.footerText || "")
    setFormLogoUrl(item.logoUrl || "")
    setFormAccreditationLogoUrl(item.accreditationLogoUrl || "")
    setFormAccreditationText(item.accreditationText || "")
    setFormShowLabLogo(item.showLabLogo)
    setFormIsDefault(item.isDefault)
    setDialogOpen(true)
  }

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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => openEdit(row.original)}
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

  async function handleSubmit() {
    if (!formName.trim()) {
      toast.error("Template name is required")
      return
    }

    setLoading(true)
    try {
      if (editingItem) {
        await updateReportTemplate(editingItem.id, {
          name: formName.trim(),
          headerText: formHeaderText || undefined,
          footerText: formFooterText || undefined,
          logoUrl: formLogoUrl || undefined,
          accreditationLogoUrl: formAccreditationLogoUrl || undefined,
          accreditationText: formAccreditationText || undefined,
          showLabLogo: formShowLabLogo,
          isDefault: formIsDefault,
        })
        toast.success("Template updated successfully")
      } else {
        await createReportTemplate({
          name: formName.trim(),
          headerText: formHeaderText || undefined,
          footerText: formFooterText || undefined,
          logoUrl: formLogoUrl || undefined,
          accreditationLogoUrl: formAccreditationLogoUrl || undefined,
          accreditationText: formAccreditationText || undefined,
          showLabLogo: formShowLabLogo,
          isDefault: formIsDefault,
        })
        toast.success("Template created successfully")
      }
      setDialogOpen(false)
      setEditingItem(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save template")
    } finally {
      setLoading(false)
    }
  }

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
        onAction={openCreate}
      />

      <DataTable
        columns={columns}
        data={templates}
        searchPlaceholder="Search templates..."
        searchKey="name"
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditingItem(null)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Template" : "New Report Template"}
            </DialogTitle>
            <DialogDescription>
              Configure header text, footer disclaimers, and logos for this template.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Template Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard COA, Fuel Testing, Oil Analysis"
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
                  <Label className="text-sm">Default Template</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formShowLabLogo} onCheckedChange={setFormShowLabLogo} />
                  <Label className="text-sm">Show Lab Logo</Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Header Text</Label>
              <Textarea
                value={formHeaderText}
                onChange={(e) => setFormHeaderText(e.target.value)}
                placeholder={"e.g. An ISO/IEC 17025:2017 Accredited Laboratory\nAccreditation No: CAB-XXX\nEmirates National Accreditation System (ENAS)"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown below the lab name. Each line is a separate row (accreditation, certifications, etc.)
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Footer Text</Label>
              <Textarea
                value={formFooterText}
                onChange={(e) => setFormFooterText(e.target.value)}
                placeholder={"This report shall not be reproduced except in full...\nThe results relate only to the items tested."}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown at the bottom of every page as disclaimer text.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Accreditation Text</Label>
              <Input
                value={formAccreditationText}
                onChange={(e) => setFormAccreditationText(e.target.value)}
                placeholder="e.g. ISO/IEC 17025:2017 Accredited | ENAS CAB-XXX"
              />
              <p className="text-xs text-muted-foreground">
                Short accreditation line shown alongside logos in the header.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lab/Company Logo</Label>
                <ImageUpload
                  value={formLogoUrl}
                  onChange={setFormLogoUrl}
                  folder="logos"
                  placeholder="Upload or paste logo URL..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Accreditation Logo</Label>
                <ImageUpload
                  value={formAccreditationLogoUrl}
                  onChange={setFormAccreditationLogoUrl}
                  folder="logos"
                  placeholder="Upload or paste accreditation logo..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : editingItem ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
