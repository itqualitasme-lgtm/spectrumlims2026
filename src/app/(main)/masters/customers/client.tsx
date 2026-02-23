"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/actions/customers"

interface Customer {
  id: string
  code: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  address: string | null
  contactPerson: string | null
  trn: string | null
  status: string
  labId: string
  createdAt: string
  updatedAt: string
  _count: {
    contactPersons: number
  }
}

interface FormData {
  name: string
  email: string
  company: string
  phone: string
  address: string
  contactPerson: string
  trn: string
}

const emptyForm: FormData = {
  name: "",
  email: "",
  company: "",
  phone: "",
  address: "",
  contactPerson: "",
  trn: "",
}

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )

  const columns: ColumnDef<Customer, any>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <a
          href={`/masters/customers/${row.original.id}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.name}
        </a>
      ),
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => row.original.company || "-",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "-",
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
            onClick={() => {
              setSelectedCustomer(row.original)
              setFormData({
                name: row.original.name,
                email: row.original.email || "",
                company: row.original.company || "",
                phone: row.original.phone || "",
                address: row.original.address || "",
                contactPerson: row.original.contactPerson || "",
                trn: row.original.trn || "",
              })
              setEditOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedCustomer(row.original)
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error("Customer name is required")
      return
    }

    setLoading(true)
    try {
      await createCustomer({
        name: formData.name,
        email: formData.email || undefined,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        contactPerson: formData.contactPerson || undefined,
        trn: formData.trn || undefined,
      })
      toast.success("Customer created successfully")
      setCreateOpen(false)
      setFormData(emptyForm)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create customer")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!selectedCustomer || !formData.name.trim()) {
      toast.error("Customer name is required")
      return
    }

    setLoading(true)
    try {
      await updateCustomer(selectedCustomer.id, {
        name: formData.name,
        email: formData.email || undefined,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        contactPerson: formData.contactPerson || undefined,
        trn: formData.trn || undefined,
      })
      toast.success("Customer updated successfully")
      setEditOpen(false)
      setSelectedCustomer(null)
      setFormData(emptyForm)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update customer")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!selectedCustomer) return

    setLoading(true)
    try {
      await deleteCustomer(selectedCustomer.id)
      toast.success("Customer deleted successfully")
      setDeleteOpen(false)
      setSelectedCustomer(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer")
    } finally {
      setLoading(false)
    }
  }

  function renderForm(onSubmit: () => void, submitLabel: string) {
    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Customer name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="email@example.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            placeholder="Company name"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="Phone number"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="Address"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            value={formData.contactPerson}
            onChange={(e) =>
              setFormData({ ...formData, contactPerson: e.target.value })
            }
            placeholder="Primary contact person"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="trn">TRN</Label>
          <Input
            id="trn"
            value={formData.trn}
            onChange={(e) =>
              setFormData({ ...formData, trn: e.target.value })
            }
            placeholder="Tax Registration Number"
          />
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer records"
        actionLabel="Add Customer"
        onAction={() => {
          setFormData(emptyForm)
          setCreateOpen(true)
        }}
      />

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search customers..."
        searchKey="name"
      />

      {/* Create Dialog - conditionally rendered to avoid duplicate id conflicts */}
      {createOpen && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            {renderForm(handleCreate, "Create Customer")}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog - conditionally rendered to avoid duplicate id conflicts */}
      {editOpen && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            {renderForm(handleUpdate, "Update Customer")}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete "${selectedCustomer?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
