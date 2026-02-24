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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Trash2, Plus } from "lucide-react"
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

type TestParam = {
  parameter: string
  method: string
  unit: string
  price: string
  tat: string
  specMin: string
  specMax: string
}

function parseTests(defaultTests: string): TestParam[] {
  try {
    const parsed = JSON.parse(defaultTests)
    if (!Array.isArray(parsed)) return []
    return parsed.map((t: any) => ({
      parameter: t.parameter || "",
      method: t.method || t.testMethod || "",
      unit: t.unit || "",
      price: t.price != null ? String(t.price) : "",
      tat: t.tat != null ? String(t.tat) : "",
      specMin: t.specMin || "",
      specMax: t.specMax || "",
    }))
  } catch {
    return []
  }
}

function serializeTests(tests: TestParam[]): string {
  const cleaned = tests
    .filter((t) => t.parameter.trim())
    .map((t) => {
      const obj: Record<string, any> = { parameter: t.parameter.trim() }
      if (t.method.trim()) obj.method = t.method.trim()
      if (t.unit.trim()) obj.unit = t.unit.trim()
      if (t.price.trim()) obj.price = parseFloat(t.price) || 0
      if (t.tat.trim()) obj.tat = parseInt(t.tat) || 0
      if (t.specMin.trim()) obj.specMin = t.specMin.trim()
      if (t.specMax.trim()) obj.specMax = t.specMax.trim()
      return obj
    })
  return JSON.stringify(cleaned)
}

function getTestsCount(defaultTests: string): number {
  try {
    const parsed = JSON.parse(defaultTests)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

const emptyParam = (): TestParam => ({
  parameter: "",
  method: "",
  unit: "",
  price: "",
  tat: "",
  specMin: "",
  specMax: "",
})

export function SampleTypesClient({
  sampleTypes,
}: {
  sampleTypes: SampleType[]
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SampleType | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formStatus, setFormStatus] = useState("active")
  const [formTests, setFormTests] = useState<TestParam[]>([emptyParam()])

  const openCreate = () => {
    setEditingItem(null)
    setFormName("")
    setFormDescription("")
    setFormStatus("active")
    setFormTests([emptyParam()])
    setDialogOpen(true)
  }

  const openEdit = (item: SampleType) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormDescription(item.description || "")
    setFormStatus(item.status)
    const parsed = parseTests(item.defaultTests)
    setFormTests(parsed.length > 0 ? parsed : [emptyParam()])
    setDialogOpen(true)
  }

  const updateTest = (index: number, field: keyof TestParam, value: string) => {
    setFormTests((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  const addTest = () => setFormTests((prev) => [...prev, emptyParam()])

  const removeTest = (index: number) => {
    if (formTests.length <= 1) return
    setFormTests((prev) => prev.filter((_, i) => i !== index))
  }

  const columns: ColumnDef<SampleType, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
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
      toast.error("Sample type name is required")
      return
    }

    const hasAnyParam = formTests.some((t) => t.parameter.trim())
    if (!hasAnyParam) {
      toast.error("Add at least one test parameter")
      return
    }

    const defaultTests = serializeTests(formTests)

    setLoading(true)
    try {
      if (editingItem) {
        await updateSampleType(editingItem.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          defaultTests,
          status: formStatus,
        })
        toast.success("Sample type updated successfully")
      } else {
        await createSampleType({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          defaultTests,
          status: formStatus,
        })
        toast.success("Sample type created successfully")
      }
      setDialogOpen(false)
      setEditingItem(null)
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
        description="Manage sample type definitions and test parameters"
        actionLabel="Add Sample Type"
        onAction={openCreate}
      />

      <DataTable
        columns={columns}
        data={sampleTypes}
        searchPlaceholder="Search sample types..."
        searchKey="name"
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditingItem(null)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Sample Type" : "Add Sample Type"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update sample type details and test parameters."
                : "Define sample type and its test parameters."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic info row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Diesel"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Test Parameters table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">Test Parameters ({formTests.filter((t) => t.parameter.trim()).length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTest}>
                  <Plus className="mr-1 h-3 w-3" /> Add Parameter
                </Button>
              </div>

              <div className="rounded border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_80px_80px_60px_80px_80px_32px] gap-x-2 px-2 py-1.5 bg-muted/50 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Parameter *</span>
                  <span>Method</span>
                  <span>Unit</span>
                  <span>Price</span>
                  <span>TAT (d)</span>
                  <span>Spec Min</span>
                  <span>Spec Max</span>
                  <span></span>
                </div>

                {/* Rows */}
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {formTests.map((test, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_80px_80px_60px_80px_80px_32px] gap-x-2 items-center px-2 py-1"
                    >
                      <Input
                        className="h-8 text-xs"
                        value={test.parameter}
                        onChange={(e) => updateTest(idx, "parameter", e.target.value)}
                        placeholder="e.g. pH"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={test.method}
                        onChange={(e) => updateTest(idx, "method", e.target.value)}
                        placeholder="e.g. ASTM D1298"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={test.unit}
                        onChange={(e) => updateTest(idx, "unit", e.target.value)}
                        placeholder="mg/L"
                      />
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min="0"
                        step="0.01"
                        value={test.price}
                        onChange={(e) => updateTest(idx, "price", e.target.value)}
                        placeholder="0.00"
                      />
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min="1"
                        max="30"
                        value={test.tat}
                        onChange={(e) => updateTest(idx, "tat", e.target.value)}
                        placeholder="1-3"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={test.specMin}
                        onChange={(e) => updateTest(idx, "specMin", e.target.value)}
                        placeholder="Min"
                      />
                      <Input
                        className="h-8 text-xs"
                        value={test.specMax}
                        onChange={(e) => updateTest(idx, "specMax", e.target.value)}
                        placeholder="Max"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeTest(idx)}
                        disabled={formTests.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading
                ? "Saving..."
                : editingItem
                  ? "Update Sample Type"
                  : "Create Sample Type"}
            </Button>
          </div>
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
