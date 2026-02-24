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
import { Pencil, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

interface TestItem {
  id: string
  name: string
  email: string
  status: string
}

const MOCK_DATA: TestItem[] = [
  { id: "1", name: "Alpha Corp", email: "alpha@test.com", status: "active" },
  { id: "2", name: "Beta Inc", email: "beta@test.com", status: "active" },
  { id: "3", name: "Gamma LLC", email: "gamma@test.com", status: "inactive" },
]

export default function TestDialogPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TestItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")

  const columns: ColumnDef<TestItem, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Dialog Page"
        description="Testing if DataTable + Dialog + ConfirmDialog causes freeze"
        actionLabel="Add Item"
        onAction={() => {
          setEditingItem(null)
          setDialogOpen(true)
        }}
      />

      <DataTable
        columns={columns}
        data={MOCK_DATA}
        searchPlaceholder="Search..."
        searchKey="name"
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditingItem(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update details below." : "Fill in details below."}
            </DialogDescription>
          </DialogHeader>
          <form key={editingItem?.id || "create"}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name || ""}
                  placeholder="Name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingItem?.email || ""}
                  placeholder="email@example.com"
                />
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
              <Button type="button" onClick={() => setDialogOpen(false)}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Item"
        description={`Are you sure you want to delete "${deletingName}"?`}
        onConfirm={() => {
          setDeleteDialogOpen(false)
          setDeletingId(null)
        }}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
