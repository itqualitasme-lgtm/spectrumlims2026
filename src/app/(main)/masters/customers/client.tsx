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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Trash2, Ban, CheckCircle2, RefreshCw, Loader2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/actions/customers"
import { syncZohoCustomers } from "@/actions/zoho-sync"

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
  paymentTerm: string | null
  zohoContactId: string | null
  status: string
  labId: string
  createdAt: string
  updatedAt: string
  _count: {
    contactPersons: number
  }
}

export function CustomersClient({
  customers,
  zohoConfigured,
}: {
  customers: Customer[]
  zohoConfigured: boolean
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [paymentTerm, setPaymentTerm] = useState("")

  async function handleZohoSync() {
    setSyncing(true)
    try {
      const result = await syncZohoCustomers()
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

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
        <div className="flex items-center gap-1.5">
          <Badge
            variant={row.original.status === "active" ? "default" : "destructive"}
          >
            {row.original.status}
          </Badge>
          {row.original.zohoContactId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-blue-600 border-blue-300">
              Zoho
            </Badge>
          )}
        </div>
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
            title={row.original.status === "active" ? "Deactivate" : "Activate"}
            onClick={() => handleToggleStatus(row.original)}
          >
            {row.original.status === "active" ? (
              <Ban className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditingItem(row.original)
              setPaymentTerm(row.original.paymentTerm || "")
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

  async function handleToggleStatus(customer: Customer) {
    const newStatus = customer.status === "active" ? "inactive" : "active"
    try {
      await updateCustomer(customer.id, { status: newStatus })
      toast.success(
        newStatus === "active"
          ? `${customer.name} activated`
          : `${customer.name} deactivated`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = (formData.get("name") as string)?.trim()

    if (!name) {
      toast.error("Customer name is required")
      return
    }
    if (!paymentTerm) {
      toast.error("Payment term is required")
      return
    }

    setLoading(true)
    try {
      if (editingItem) {
        await updateCustomer(editingItem.id, {
          name,
          email: (formData.get("email") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          address: (formData.get("address") as string) || undefined,
          contactPerson: (formData.get("contactPerson") as string) || undefined,
          trn: (formData.get("trn") as string) || undefined,
          paymentTerm,
        })
        toast.success("Customer updated successfully")
      } else {
        await createCustomer({
          name,
          email: (formData.get("email") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          phone: (formData.get("phone") as string) || undefined,
          address: (formData.get("address") as string) || undefined,
          contactPerson: (formData.get("contactPerson") as string) || undefined,
          trn: (formData.get("trn") as string) || undefined,
          paymentTerm,
        })
        toast.success("Customer created successfully")
      }
      setDialogOpen(false)
      setEditingItem(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save customer")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return

    setLoading(true)
    try {
      await deleteCustomer(deletingId)
      toast.success("Customer deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete customer")
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
        title="Customers"
        description="Manage your customer records"
        actionLabel="Add Customer"
        onAction={() => {
          setEditingItem(null)
          setPaymentTerm("")
          setDialogOpen(true)
        }}
      >
        {zohoConfigured && (
          <Button variant="outline" onClick={handleZohoSync} disabled={syncing}>
            {syncing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" /> Sync from Zoho</>
            )}
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Search customers..."
        searchKey="name"
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditingItem(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update customer details below."
                : "Fill in the customer details below."}
            </DialogDescription>
          </DialogHeader>
          <form key={editingItem?.id || "create"} onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  defaultValue={editingItem?.name || ""}
                  placeholder="Customer name"
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
              <div className="grid gap-2">
                <Label>Company</Label>
                <Input
                  name="company"
                  defaultValue={editingItem?.company || ""}
                  placeholder="Company name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  name="phone"
                  defaultValue={editingItem?.phone || ""}
                  placeholder="Phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Textarea
                  name="address"
                  defaultValue={editingItem?.address || ""}
                  placeholder="Full address"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input
                  name="contactPerson"
                  defaultValue={editingItem?.contactPerson || ""}
                  placeholder="Primary contact person"
                />
              </div>
              <div className="grid gap-2">
                <Label>TRN</Label>
                <Input
                  name="trn"
                  defaultValue={editingItem?.trn || ""}
                  placeholder="Tax Registration Number"
                />
              </div>
              <div className="grid gap-2">
                <Label>Payment Term *</Label>
                <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="30 Days">30 Days</SelectItem>
                    <SelectItem value="60 Days">60 Days</SelectItem>
                    <SelectItem value="Advance 50%">Advance 50%</SelectItem>
                    <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingItem
                    ? "Update Customer"
                    : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deletingName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
