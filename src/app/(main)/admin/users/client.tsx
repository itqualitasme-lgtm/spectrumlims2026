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

interface UserFormData {
  name: string
  email: string
  username: string
  password: string
  phone: string
  roleId: string
}

interface PortalUserFormData {
  username: string
  password: string
  customerId: string
}

interface EditPortalUserFormData {
  isActive: boolean
  password: string
}

const emptyUserForm: UserFormData = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  roleId: "",
}

const emptyPortalUserForm: PortalUserFormData = {
  username: "",
  password: "",
  customerId: "",
}

const emptyEditPortalUserForm: EditPortalUserFormData = {
  isActive: true,
  password: "",
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

  // Employee user state - single dialog
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [userFormMode, setUserFormMode] = useState<"create" | "edit">("create")
  const [deleteUserOpen, setDeleteUserOpen] = useState(false)
  const [userForm, setUserForm] = useState<UserFormData>(emptyUserForm)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Portal user state - single dialog
  const [portalFormOpen, setPortalFormOpen] = useState(false)
  const [portalFormMode, setPortalFormMode] = useState<"create" | "edit">("create")
  const [deletePortalOpen, setDeletePortalOpen] = useState(false)
  const [portalForm, setPortalForm] =
    useState<PortalUserFormData>(emptyPortalUserForm)
  const [editPortalForm, setEditPortalForm] =
    useState<EditPortalUserFormData>(emptyEditPortalUserForm)
  const [selectedPortalUser, setSelectedPortalUser] =
    useState<PortalUserType | null>(null)

  // Active tab
  const [activeTab, setActiveTab] = useState("employees")

  // ========== Employee User Columns ==========
  const userColumns: ColumnDef<User, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "username",
      header: "Username",
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
      accessorKey: "role.name",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role.name}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className={
            row.original.isActive
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-red-100 text-red-800 hover:bg-red-100"
          }
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) => formatDate(row.original.lastLoginAt),
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
              setSelectedUser(row.original)
              setUserForm({
                name: row.original.name,
                email: row.original.email || "",
                username: row.original.username,
                password: "",
                phone: row.original.phone || "",
                roleId: row.original.roleId,
              })
              setUserFormMode("edit")
              setUserFormOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleToggleUserActive(row.original)}
          >
            {row.original.isActive ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedUser(row.original)
              setDeleteUserOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  // ========== Portal User Columns ==========
  const portalUserColumns: ColumnDef<PortalUserType, any>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customer.company || row.original.customer.name,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? "default" : "secondary"}
          className={
            row.original.isActive
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-red-100 text-red-800 hover:bg-red-100"
          }
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLogin",
      header: "Last Login",
      cell: ({ row }) => formatDate(row.original.lastLogin),
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
              setSelectedPortalUser(row.original)
              setEditPortalForm({
                isActive: row.original.isActive,
                password: "",
              })
              setPortalFormMode("edit")
              setPortalFormOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedPortalUser(row.original)
              setDeletePortalOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  // ========== Employee User Handlers ==========
  async function handleSubmitUser() {
    if (!userForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    if (!userForm.username.trim()) {
      toast.error("Username is required")
      return
    }
    if (!userForm.roleId) {
      toast.error("Role is required")
      return
    }

    if (userFormMode === "create" && !userForm.password.trim()) {
      toast.error("Password is required")
      return
    }

    setLoading(true)
    try {
      if (userFormMode === "create") {
        await createUser({
          name: userForm.name,
          email: userForm.email || undefined,
          username: userForm.username,
          password: userForm.password,
          phone: userForm.phone || undefined,
          roleId: userForm.roleId,
        })
        toast.success("User created successfully")
      } else {
        if (!selectedUser) return
        await updateUser(selectedUser.id, {
          name: userForm.name,
          email: userForm.email || undefined,
          phone: userForm.phone || undefined,
          roleId: userForm.roleId,
          password: userForm.password || undefined,
        })
        toast.success("User updated successfully")
      }
      setUserFormOpen(false)
      setSelectedUser(null)
      setUserForm(emptyUserForm)
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
      toast.success(
        user.isActive
          ? "User deactivated successfully"
          : "User activated successfully"
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return

    setLoading(true)
    try {
      await deleteUser(selectedUser.id)
      toast.success("User deleted successfully")
      setDeleteUserOpen(false)
      setSelectedUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user")
    } finally {
      setLoading(false)
    }
  }

  // ========== Portal User Handlers ==========
  async function handleSubmitPortalUser() {
    if (portalFormMode === "create") {
      if (!portalForm.username.trim()) {
        toast.error("Username is required")
        return
      }
      if (!portalForm.password.trim()) {
        toast.error("Password is required")
        return
      }
      if (!portalForm.customerId) {
        toast.error("Customer is required")
        return
      }

      setLoading(true)
      try {
        await createPortalUser({
          username: portalForm.username,
          password: portalForm.password,
          customerId: portalForm.customerId,
        })
        toast.success("Portal user created successfully")
        setPortalFormOpen(false)
        setPortalForm(emptyPortalUserForm)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Failed to create portal user")
      } finally {
        setLoading(false)
      }
    } else {
      if (!selectedPortalUser) return

      setLoading(true)
      try {
        await updatePortalUser(selectedPortalUser.id, {
          isActive: editPortalForm.isActive,
          password: editPortalForm.password || undefined,
        })
        toast.success("Portal user updated successfully")
        setPortalFormOpen(false)
        setSelectedPortalUser(null)
        setEditPortalForm(emptyEditPortalUserForm)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Failed to update portal user")
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleDeletePortalUser() {
    if (!selectedPortalUser) return

    setLoading(true)
    try {
      await deletePortalUser(selectedPortalUser.id)
      toast.success("Portal user deleted successfully")
      setDeletePortalOpen(false)
      setSelectedPortalUser(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete portal user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage employee and portal user accounts"
        actionLabel={activeTab === "employees" ? "Add User" : "Add Portal User"}
        onAction={() => {
          if (activeTab === "employees") {
            setUserForm(emptyUserForm)
            setSelectedUser(null)
            setUserFormMode("create")
            setUserFormOpen(true)
          } else {
            setPortalForm(emptyPortalUserForm)
            setSelectedPortalUser(null)
            setPortalFormMode("create")
            setPortalFormOpen(true)
          }
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="portal">Portal Users</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <DataTable
            columns={userColumns}
            data={users}
            searchPlaceholder="Search employees..."
            searchKey="name"
          />
        </TabsContent>

        <TabsContent value="portal">
          <DataTable
            columns={portalUserColumns}
            data={portalUsers}
            searchPlaceholder="Search portal users..."
            searchKey="username"
          />
        </TabsContent>
      </Tabs>

      {/* Single Employee User Dialog */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userFormMode === "create" ? "Add User" : "Edit User"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Username *</Label>
              <Input
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                placeholder="Username"
                disabled={userFormMode === "edit"}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                Password{" "}
                {userFormMode === "edit"
                  ? "(leave blank to keep current)"
                  : "*"}
              </Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
                placeholder={
                  userFormMode === "edit"
                    ? "Leave blank to keep current"
                    : "Password"
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={userForm.phone}
                onChange={(e) =>
                  setUserForm({ ...userForm, phone: e.target.value })
                }
                placeholder="Phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role *</Label>
              <Select
                value={userForm.roleId}
                onValueChange={(value) =>
                  setUserForm({ ...userForm, roleId: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmitUser} disabled={loading}>
                {loading
                  ? "Saving..."
                  : userFormMode === "create"
                    ? "Create User"
                    : "Update User"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <ConfirmDialog
        open={deleteUserOpen}
        onOpenChange={setDeleteUserOpen}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />

      {/* Single Portal User Dialog */}
      <Dialog open={portalFormOpen} onOpenChange={setPortalFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {portalFormMode === "create"
                ? "Add Portal User"
                : "Edit Portal User"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {portalFormMode === "create" ? (
              <>
                <div className="grid gap-2">
                  <Label>Username *</Label>
                  <Input
                    value={portalForm.username}
                    onChange={(e) =>
                      setPortalForm({
                        ...portalForm,
                        username: e.target.value,
                      })
                    }
                    placeholder="Username"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={portalForm.password}
                    onChange={(e) =>
                      setPortalForm({
                        ...portalForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Customer *</Label>
                  <Select
                    value={portalForm.customerId}
                    onValueChange={(value) =>
                      setPortalForm({ ...portalForm, customerId: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company || customer.name} ({customer.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    value={selectedPortalUser?.username || ""}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editPortalForm.isActive ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setEditPortalForm({
                        ...editPortalForm,
                        isActive: value === "active",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Password (leave blank to keep current)</Label>
                  <Input
                    type="password"
                    value={editPortalForm.password}
                    onChange={(e) =>
                      setEditPortalForm({
                        ...editPortalForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Leave blank to keep current"
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button onClick={handleSubmitPortalUser} disabled={loading}>
                {loading
                  ? "Saving..."
                  : portalFormMode === "create"
                    ? "Create Portal User"
                    : "Update Portal User"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Portal User Confirm */}
      <ConfirmDialog
        open={deletePortalOpen}
        onOpenChange={setDeletePortalOpen}
        title="Delete Portal User"
        description={`Are you sure you want to delete portal user "${selectedPortalUser?.username}"? This action cannot be undone.`}
        onConfirm={handleDeletePortalUser}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
