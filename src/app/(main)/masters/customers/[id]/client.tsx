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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface ContactFormData {
  name: string
  email: string
  phone: string
  designation: string
}

const emptyContactForm: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  designation: "",
}

export function CustomerDetailClient({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [contactForm, setContactForm] =
    useState<ContactFormData>(emptyContactForm)
  const [selectedContact, setSelectedContact] =
    useState<ContactPerson | null>(null)

  async function handleSubmit() {
    if (!contactForm.name.trim()) {
      toast.error("Contact person name is required")
      return
    }

    setLoading(true)
    try {
      if (formMode === "create") {
        await createContactPerson({
          customerId: customer.id,
          name: contactForm.name,
          email: contactForm.email || undefined,
          phone: contactForm.phone || undefined,
          designation: contactForm.designation || undefined,
        })
        toast.success("Contact person added successfully")
      } else {
        if (!selectedContact) return
        await updateContactPerson(selectedContact.id, {
          customerId: customer.id,
          name: contactForm.name,
          email: contactForm.email || undefined,
          phone: contactForm.phone || undefined,
          designation: contactForm.designation || undefined,
        })
        toast.success("Contact person updated successfully")
      }
      setFormOpen(false)
      setSelectedContact(null)
      setContactForm(emptyContactForm)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save contact person")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteContact() {
    if (!selectedContact) return

    setLoading(true)
    try {
      await deleteContactPerson(selectedContact.id, customer.id)
      toast.success("Contact person deleted successfully")
      setDeleteOpen(false)
      setSelectedContact(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact person")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/masters/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      {/* Customer info card */}
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

      {/* Tabs */}
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
                setContactForm(emptyContactForm)
                setSelectedContact(null)
                setFormMode("create")
                setFormOpen(true)
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
                              setSelectedContact(contact)
                              setContactForm({
                                name: contact.name,
                                email: contact.email || "",
                                phone: contact.phone || "",
                                designation: contact.designation || "",
                              })
                              setFormMode("edit")
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedContact(contact)
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

      {/* Single Contact Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create"
                ? "Add Contact Person"
                : "Edit Contact Person"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm({ ...contactForm, name: e.target.value })
                }
                placeholder="Contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm({ ...contactForm, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm({ ...contactForm, phone: e.target.value })
                }
                placeholder="Phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label>Designation</Label>
              <Input
                value={contactForm.designation}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    designation: e.target.value,
                  })
                }
                placeholder="e.g. Lab Manager, Quality Head"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading
                  ? "Saving..."
                  : formMode === "create"
                    ? "Add Contact"
                    : "Update Contact"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact Person"
        description={`Are you sure you want to delete "${selectedContact?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteContact}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
