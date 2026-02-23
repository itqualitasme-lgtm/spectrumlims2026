"use client"

import { useState, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Trash2 } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createRole,
  updateRole,
  deleteRole,
  getRole,
} from "@/actions/roles"

interface Role {
  id: string
  name: string
  labId: string
  isSystem: boolean
  createdAt: string
  _count: {
    users: number
    rolePermissions: number
  }
}

interface Permission {
  id: string
  module: string
  action: string
}

const MODULES = ["dashboard", "masters", "process", "accounts", "reports", "admin"]
const ACTIONS = ["view", "create", "edit", "delete"]

export function RolesClient({
  roles,
  permissions,
}: {
  roles: Role[]
  permissions: Permission[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Single dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Form state
  const [roleName, setRoleName] = useState("")
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Build a lookup map: module -> action -> permission id
  const permissionMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const p of permissions) {
      if (!map[p.module]) map[p.module] = {}
      map[p.module][p.action] = p.id
    }
    return map
  }, [permissions])

  // ========== Permission helpers ==========
  function isPermissionChecked(module: string, action: string): boolean {
    const id = permissionMap[module]?.[action]
    return id ? selectedPermissionIds.has(id) : false
  }

  function togglePermission(module: string, action: string) {
    const id = permissionMap[module]?.[action]
    if (!id) return
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function isModuleAllChecked(module: string): boolean {
    return ACTIONS.every((action) => {
      const id = permissionMap[module]?.[action]
      return id ? selectedPermissionIds.has(id) : true
    })
  }

  function toggleModuleAll(module: string) {
    const allChecked = isModuleAllChecked(module)
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev)
      for (const action of ACTIONS) {
        const id = permissionMap[module]?.[action]
        if (id) {
          if (allChecked) {
            next.delete(id)
          } else {
            next.add(id)
          }
        }
      }
      return next
    })
  }

  function isAllChecked(): boolean {
    return permissions.every((p) => selectedPermissionIds.has(p.id))
  }

  function toggleAll() {
    const allChecked = isAllChecked()
    if (allChecked) {
      setSelectedPermissionIds(new Set())
    } else {
      setSelectedPermissionIds(new Set(permissions.map((p) => p.id)))
    }
  }

  // ========== Columns ==========
  const columns: ColumnDef<Role, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "isSystem",
      header: "System",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isSystem ? "default" : "secondary"}
        >
          {row.original.isSystem ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "_count.users",
      header: "Users",
      cell: ({ row }) => row.original._count.users,
    },
    {
      accessorKey: "_count.rolePermissions",
      header: "Permissions",
      cell: ({ row }) => row.original._count.rolePermissions,
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
            onClick={() => handleOpenEdit(row.original)}
          >
            <Shield className="h-4 w-4" />
          </Button>
          {!row.original.isSystem && row.original._count.users === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => {
                setSelectedRole(row.original)
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  // ========== Handlers ==========
  function handleOpenCreate() {
    setRoleName("")
    setSelectedPermissionIds(new Set())
    setSelectedRole(null)
    setFormMode("create")
    setFormOpen(true)
  }

  async function handleOpenEdit(role: Role) {
    setLoading(true)
    try {
      const fullRole = await getRole(role.id)
      setSelectedRole(role)
      setRoleName(fullRole.name)
      setSelectedPermissionIds(
        new Set(fullRole.rolePermissions.map((rp: any) => rp.permissionId))
      )
      setFormMode("edit")
      setFormOpen(true)
    } catch (error: any) {
      toast.error(error.message || "Failed to load role")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (formMode === "create") {
      if (!roleName.trim()) {
        toast.error("Role name is required")
        return
      }

      setLoading(true)
      try {
        await createRole({
          name: roleName.trim(),
          permissionIds: Array.from(selectedPermissionIds),
        })
        toast.success("Role created successfully")
        setFormOpen(false)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Failed to create role")
      } finally {
        setLoading(false)
      }
    } else {
      if (!selectedRole) return

      setLoading(true)
      try {
        await updateRole(selectedRole.id, {
          name: roleName.trim() || undefined,
          permissionIds: Array.from(selectedPermissionIds),
        })
        toast.success("Role updated successfully")
        setFormOpen(false)
        setSelectedRole(null)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || "Failed to update role")
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleDeleteRole() {
    if (!selectedRole) return

    setLoading(true)
    try {
      await deleteRole(selectedRole.id)
      toast.success("Role deleted successfully")
      setDeleteOpen(false)
      setSelectedRole(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role")
    } finally {
      setLoading(false)
    }
  }

  // ========== Permission Grid ==========
  const isSystemRole = formMode === "edit" && (selectedRole?.isSystem ?? false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and their permissions"
        actionLabel="Create Role"
        onAction={handleOpenCreate}
      />

      <DataTable
        columns={columns}
        data={roles}
        searchPlaceholder="Search roles..."
        searchKey="name"
      />

      {/* Single Role Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create Role" : "Edit Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Role Name {formMode === "create" ? "*" : ""}</Label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Enter role name"
                disabled={isSystemRole}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Permissions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  disabled={isSystemRole}
                >
                  {isAllChecked() ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="rounded-md border">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Module</th>
                        {ACTIONS.map((action) => (
                          <th key={action} className="text-center px-4 py-2 font-medium capitalize">
                            {action}
                          </th>
                        ))}
                        <th className="text-center px-4 py-2 font-medium">All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((module) => (
                        <tr key={module} className="border-t">
                          <td className="px-4 py-2 font-medium capitalize">{module}</td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="text-center px-4 py-2">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={isPermissionChecked(module, action)}
                                  onCheckedChange={() => togglePermission(module, action)}
                                  disabled={isSystemRole}
                                />
                              </div>
                            </td>
                          ))}
                          <td className="text-center px-4 py-2">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isModuleAllChecked(module)}
                                onCheckedChange={() => toggleModuleAll(module)}
                                disabled={isSystemRole}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={loading || isSystemRole}
              >
                {loading
                  ? "Saving..."
                  : formMode === "create"
                    ? "Create Role"
                    : "Update Role"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${selectedRole?.name}"? This will also remove all permission assignments for this role. This action cannot be undone.`}
        onConfirm={handleDeleteRole}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
