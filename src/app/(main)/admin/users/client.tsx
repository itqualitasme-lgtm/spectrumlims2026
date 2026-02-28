"use client"

import { useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ImageUpload } from "@/components/shared/image-upload"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createUser,
  updateUser,
  deleteUser,
  createPortalUser,
  updatePortalUser,
  deletePortalUser,
} from "@/actions/users"

interface User {
  id: string
  name: string
  email: string | null
  username: string
  phone: string | null
  roleId: string
  labId: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  designation: string | null
  signatureUrl: string | null
  role: { name: string }
}

interface PortalUserType {
  id: string
  username: string
  customerId: string
  labId: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  customer: { name: string; company: string | null }
}

interface Role {
  id: string
  name: string
  labId: string
  isSystem: boolean
}

interface Customer {
  id: string
  code: string
  name: string
  company: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UsersClient({
  users,
  portalUsers,
  roles,
  customers,
}: {
  users: User[]
  portalUsers: PortalUserType[]
  roles: Role[]
  customers: Customer[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("employees")

  // Employee user dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userRoleId, setUserRoleId] = useState("")
  const [userSignatureUrl, setUserSignatureUrl] = useState("")
  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [deletingUserName, setDeletingUserName] = useState("")

  // Portal user dialog
  const [portalDialogOpen, setPortalDialogOpen] = useState(false)
  const [editingPortalUser, setEditingPortalUser] = useState<PortalUserType | null>(null)
  const [portalCustomerId, setPortalCustomerId] = useState("")
  const [portalStatusValue, setPortalStatusValue] = useState("active")
  const [deletePortalOpen, setDeletePortalOpen] = useState(false)
  const [deletingPortalId, setDeletingPortalId] = useState<string | null>(null)
  const [deletingPortalName, setDeletingPortalName] = useState("")

  const userColumns: ColumnDef<User, any>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "username", header: "Username" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone || "-" },
    {
      accessorKey: "role.name",
      header: "Role",
      cell: ({ row }) => <Badge variant="outline">{row.original.role.name}</Badge>,
    },
    { accessorKey: "designation", header: "Designation", cell: ({ row }) => row.original.designation || "-" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className={row.original.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { accessorKey: "lastLoginAt", header: "Last Login", cell: ({ row }) => formatDate(row.original.lastLoginAt) },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
            setEditingUser(row.original)
            setUserRoleId(row.original.roleId)
            setUserSignatureUrl(row.original.signatureUrl || "")
            setUserDialogOpen(true)
          }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleToggleUserActive(row.original)}>
            {row.original.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => {
            setDeletingUserId(row.original.id)
            setDeletingUserName(row.original.name)
            setDeleteUserOpen(true)
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const portalUserColumns: ColumnDef<PortalUserType, any>[] = [
    { accessorKey: "username", header: "Username" },
    { accessorKey: "customer", header: "Customer", cell: ({ row }) => row.original.customer.company || row.original.customer.name },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className={row.original.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { accessorKey: "lastLogin", header: "Last Login", cell: ({ row }) => formatDate(row.original.lastLogin) },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
            setEditingPortalUser(row.original)
            setPortalStatusValue(row.original.isActive ? "active" : "inactive")
            setPortalDialogOpen(true)
          }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => {
            setDeletingPortalId(row.original.id)
            setDeletingPortalName(row.original.username)
            setDeletePortalOpen(true)
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  async function handleSubmitUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get("name") as string)?.trim()
    const username = (fd.get("username") as string)?.trim()
    const password = (fd.get("password") as string)?.trim()
    const email = fd.get("email") as string
    const phone = fd.get("phone") as string
    const designation = (fd.get("designation") as string)?.trim()

    if (!name) { toast.error("Name is required"); return }
    if (!username) { toast.error("Username is required"); return }
    if (!userRoleId) { toast.error("Role is required"); return }
    if (!editingUser && !password) { toast.error("Password is required"); return }

    setLoading(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name, username, email: email || undefined, phone: phone || undefined,
          roleId: userRoleId, password: password || undefined,
          designation: designation || undefined,
          signatureUrl: userSignatureUrl || undefined,
        })
        toast.success("User updated successfully")
      } else {
        await createUser({
          name, email: email || undefined, username, password: password!,
          phone: phone || undefined, roleId: userRoleId,
          designation: designation || undefined,
          signatureUrl: userSignatureUrl || undefined,
        })
        toast.success("User created successfully")
      }
      setUserDialogOpen(false)
      setEditingUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save user")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleUserActive(user: User) {
    setLoading(true)
    try {
      await updateUser(user.id, { isActive: !user.isActive })
      toast.success(user.isActive ? "User deactivated" : "User activated")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!deletingUserId) return
    setLoading(true)
    try {
      await deleteUser(deletingUserId)
      toast.success("User deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user")
    } finally {
      setLoading(false)
      setDeleteUserOpen(false)
      setDeletingUserId(null)
    }
    router.refresh()
  }

  async function handleSubmitPortalUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const username = (fd.get("username") as string)?.trim()
    const password = (fd.get("password") as string)?.trim()

    setLoading(true)
    try {
      if (editingPortalUser) {
        await updatePortalUser(editingPortalUser.id, {
          isActive: portalStatusValue === "active",
          password: password || undefined,
        })
        toast.success("Portal user updated successfully")
      } else {
        if (!username) { toast.error("Username is required"); setLoading(false); return }
        if (!password) { toast.error("Password is required"); setLoading(false); return }
        if (!portalCustomerId) { toast.error("Customer is required"); setLoading(false); return }
        await createPortalUser({ username, password, customerId: portalCustomerId })
        toast.success("Portal user created successfully")
      }
      setPortalDialogOpen(false)
      setEditingPortalUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save portal user")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePortalUser() {
    if (!deletingPortalId) return
    setLoading(true)
    try {
      await deletePortalUser(deletingPortalId)
      toast.success("Portal user deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete portal user")
    } finally {
      setLoading(false)
      setDeletePortalOpen(false)
      setDeletingPortalId(null)
    }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage employee and portal user accounts"
        actionLabel={activeTab === "employees" ? "Add User" : "Add Portal User"}
        onAction={() => {
          if (activeTab === "employees") {
            setEditingUser(null)
            setUserRoleId("")
            setUserSignatureUrl("")
            setUserDialogOpen(true)
          } else {
            setEditingPortalUser(null)
            setPortalCustomerId("")
            setPortalDialogOpen(true)
          }
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="portal">Portal Users</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <DataTable columns={userColumns} data={users} searchPlaceholder="Search employees..." searchKey="name" />
        </TabsContent>
        <TabsContent value="portal">
          <DataTable columns={portalUserColumns} data={portalUsers} searchPlaceholder="Search portal users..." searchKey="username" />
        </TabsContent>
      </Tabs>

      {/* Employee User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={(open) => { setUserDialogOpen(open); if (!open) setEditingUser(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>{editingUser ? "Update user details below." : "Fill in the user details below."}</DialogDescription>
          </DialogHeader>
          <form key={editingUser?.id || "create-user"} onSubmit={handleSubmitUser}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingUser?.name || ""} placeholder="Full name" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingUser?.email || ""} placeholder="email@example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Username *</Label>
                <Input name="username" defaultValue={editingUser?.username || ""} placeholder="Username" />
              </div>
              <div className="grid gap-2">
                <Label>Password {editingUser ? "(leave blank to keep current)" : "*"}</Label>
                <Input name="password" type="password" defaultValue="" placeholder={editingUser ? "Leave blank to keep current" : "Password"} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input name="phone" defaultValue={editingUser?.phone || ""} placeholder="Phone number" />
              </div>
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select value={userRoleId} onValueChange={setUserRoleId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Designation</Label>
                <Input name="designation" defaultValue={editingUser?.designation || ""} placeholder="e.g. Senior Chemist, Lab Manager" />
              </div>
              <div className="grid gap-2">
                <Label>Digital Signature</Label>
                <ImageUpload
                  value={userSignatureUrl}
                  onChange={setUserSignatureUrl}
                  folder="signatures"
                  placeholder="Upload signature image..."
                />
                <p className="text-xs text-muted-foreground">Used for digital signing of reports (PNG with transparent background recommended).</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingUser ? "Update User" : "Create User"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen} title="Delete User"
        description={`Are you sure you want to delete "${deletingUserName}"? This action cannot be undone.`}
        onConfirm={handleDeleteUser} confirmLabel="Delete" destructive loading={loading} />

      {/* Portal User Dialog */}
      <Dialog open={portalDialogOpen} onOpenChange={(open) => { setPortalDialogOpen(open); if (!open) setEditingPortalUser(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPortalUser ? "Edit Portal User" : "Add Portal User"}</DialogTitle>
            <DialogDescription>{editingPortalUser ? "Update portal user details below." : "Fill in the portal user details below."}</DialogDescription>
          </DialogHeader>
          <form key={editingPortalUser?.id || "create-portal"} onSubmit={handleSubmitPortalUser}>
            <div className="grid gap-4 py-4">
              {editingPortalUser ? (
                <>
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input defaultValue={editingPortalUser.username} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={portalStatusValue} onValueChange={setPortalStatusValue}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Password (leave blank to keep current)</Label>
                    <Input name="password" type="password" defaultValue="" placeholder="Leave blank to keep current" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label>Username *</Label>
                    <Input name="username" defaultValue="" placeholder="Username" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password *</Label>
                    <Input name="password" type="password" defaultValue="" placeholder="Password" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Customer *</Label>
                    <Select value={portalCustomerId} onValueChange={setPortalCustomerId}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.company || c.name} ({c.code})</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPortalDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingPortalUser ? "Update Portal User" : "Create Portal User"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deletePortalOpen} onOpenChange={setDeletePortalOpen} title="Delete Portal User"
        description={`Are you sure you want to delete portal user "${deletingPortalName}"? This action cannot be undone.`}
        onConfirm={handleDeletePortalUser} confirmLabel="Delete" destructive loading={loading} />
    </div>
  )
}
