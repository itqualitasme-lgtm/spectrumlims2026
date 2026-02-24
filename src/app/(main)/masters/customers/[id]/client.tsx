"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
} from "@/actions/contact-persons"

interface ContactPerson {
  id: string
  customerId: string
  name: string
  email: string | null
  phone: string | null
  designation: string | null
}

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
  contactPersons: ContactPerson[]
}

export function CustomerDetailClient({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<ContactPerson | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get("name") as string)?.trim()

    if (!name) {
      toast.error("Contact person name is required")
      return
    }

    setLoading(true)
    try {
      if (editingContact) {
        await updateContactPerson(editingContact.id, {
          customerId: customer.id,
          name,
          email: (fd.get("email") as string) || undefined,
          phone: (fd.get("phone") as string) || undefined,
          designation: (fd.get("designation") as string) || undefined,
        })
        toast.success("Contact person updated successfully")
      } else {
        await createContactPerson({
          customerId: customer.id,
          name,
          email: (fd.get("email") as string) || undefined,
          phone: (fd.get("phone") as string) || undefined,
          designation: (fd.get("designation") as string) || undefined,
        })
        toast.success("Contact person added successfully")
      }
      setDialogOpen(false)
      setEditingContact(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save contact person")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deletingContact) return

    setLoading(true)
    try {
      await deleteContactPerson(deletingContact.id, customer.id)
      toast.success("Contact person deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact person")
    } finally {
      setLoading(false)
      setDeleteOpen(false)
      setDeletingContact(null)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/masters/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{customer.name}</CardTitle>
            <Badge
              variant={customer.status === "active" ? "default" : "secondary"}
            >
              {customer.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{customer.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{customer.company || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{customer.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customer.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{customer.address || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TRN</p>
              <p className="font-medium">{customer.trn || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{customer.contactPerson || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">
            Contact Persons ({customer.contactPersons.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingContact(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Contact Person
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.contactPersons.length > 0 ? (
                  customer.contactPersons.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>{contact.designation || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingContact(contact)
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
                              setDeletingContact(contact)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No contact persons found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) setEditingContact(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact Person" : "Add Contact Person"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update contact person details below."
                : "Fill in the contact person details below."}
            </DialogDescription>
          </DialogHeader>
          <form key={editingContact?.id || "create"} onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  defaultValue={editingContact?.name || ""}
                  placeholder="Contact person name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editingContact?.email || ""}
                  placeholder="email@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  name="phone"
                  defaultValue={editingContact?.phone || ""}
                  placeholder="Phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label>Designation</Label>
                <Input
                  name="designation"
                  defaultValue={editingContact?.designation || ""}
                  placeholder="e.g. Lab Manager, Quality Head"
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
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : editingContact
                    ? "Update Contact"
                    : "Add Contact"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact Person"
        description={`Are you sure you want to delete "${deletingContact?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
