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

/* ============================================================
   TEST A — DataTable with edit buttons, Dialog, NO ConfirmDialog
   ============================================================ */
function TestA() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TestItem | null>(null)

  const columns: ColumnDef<TestItem, any>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
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
      ),
    },
  ]

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h2 className="font-bold text-lg">Test A: DataTable + Dialog (NO ConfirmDialog)</h2>
      <Button onClick={() => { setEditingItem(null); setDialogOpen(true) }}>
        Add Item
      </Button>
      <DataTable columns={columns} data={MOCK_DATA} searchPlaceholder="Search..." searchKey="name" />
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"}</DialogTitle>
            <DialogDescription>Test A dialog</DialogDescription>
          </DialogHeader>
          <Input defaultValue={editingItem?.name || ""} placeholder="Name" />
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ============================================================
   TEST B — Plain table (no DataTable), Dialog + ConfirmDialog
   ============================================================ */
function TestB() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TestItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h2 className="font-bold text-lg">Test B: Plain table + Dialog + ConfirmDialog (NO DataTable)</h2>
      <Button onClick={() => { setEditingItem(null); setDialogOpen(true) }}>
        Add Item
      </Button>
      <table className="w-full text-sm border">
        <thead><tr className="border-b"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {MOCK_DATA.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2">{item.name}</td>
              <td className="p-2">{item.email}</td>
              <td className="p-2 flex gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingItem(item); setDialogOpen(true) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"}</DialogTitle>
            <DialogDescription>Test B dialog</DialogDescription>
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

/* ============================================================
   TEST C — DataTable + Dialog + ConfirmDialog (full combo)
   ============================================================ */
function TestC() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TestItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const columns: ColumnDef<TestItem, any>[] = [
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
    <div className="border rounded-lg p-4 space-y-4">
      <h2 className="font-bold text-lg">Test C: DataTable + Dialog + ConfirmDialog (FULL combo)</h2>
      <Button onClick={() => { setEditingItem(null); setDialogOpen(true) }}>
        Add Item
      </Button>
      <DataTable columns={columns} data={MOCK_DATA} searchPlaceholder="Search..." searchKey="name" />
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add"}</DialogTitle>
            <DialogDescription>Test C dialog</DialogDescription>
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

/* ============================================================
   TEST D — DataTable only, edit button just logs (no dialog)
   ============================================================ */
function TestD() {
  const columns: ColumnDef<TestItem, any>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
          onClick={() => alert("Edit: " + row.original.name)}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h2 className="font-bold text-lg">Test D: DataTable only (NO dialog, just alert)</h2>
      <DataTable columns={columns} data={MOCK_DATA} searchPlaceholder="Search..." searchKey="name" />
    </div>
  )
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function TestDialogPage() {
  return (
    <div className="space-y-8 p-2">
      <div>
        <h1 className="text-2xl font-bold">Dialog Freeze Isolation Tests</h1>
        <p className="text-muted-foreground">Test each section. Report which ones freeze.</p>
      </div>
      <TestD />
      <TestB />
      <TestA />
      <TestC />
    </div>
  )
}
