"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
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
import { Pencil, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

interface Item {
  id: string
  name: string
  email: string
}

const MOCK = [
  { id: "1", name: "Alpha Corp", email: "alpha@test.com" },
  { id: "2", name: "Beta Inc", email: "beta@test.com" },
  { id: "3", name: "Gamma LLC", email: "gamma@test.com" },
]

export default function TestDialogPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const columns: ColumnDef<Item, any>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
            onClick={() => { setEditingItem(row.original); setDialogOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
            onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Inline Test (no separate client.tsx)</h1>
      <Button onClick={() => { setEditingItem(null); setDialogOpen(true) }}>
        Add Item
      </Button>
      <DataTable columns={columns} data={MOCK} searchPlaceholder="Search..." searchKey="name" />
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"}</DialogTitle>
            <DialogDescription>Test dialog</DialogDescription>
          </DialogHeader>
          <Input defaultValue={editingItem?.name || ""} placeholder="Name" />
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete"
        description="Are you sure?"
        onConfirm={() => setDeleteOpen(false)}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
