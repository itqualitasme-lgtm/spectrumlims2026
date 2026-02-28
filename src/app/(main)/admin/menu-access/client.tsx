"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { menuGroups } from "@/lib/menu-items"
import { hasPermission } from "@/lib/permissions-client"
import { getUserMenuAccess, updateUserMenuAccess } from "@/actions/users"

interface UserItem {
  id: string
  name: string
  username: string
  roleName: string
}

export function MenuAccessClient({ users }: { users: UserItem[] }) {
  const [selectedUserId, setSelectedUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hiddenItems, setHiddenItems] = useState<string[]>([])
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [roleName, setRoleName] = useState("")

  const selectedUser = users.find((u) => u.id === selectedUserId)

  async function handleSelectUser(userId: string) {
    setSelectedUserId(userId)
    if (!userId) {
      setHiddenItems([])
      setRolePermissions([])
      setRoleName("")
      return
    }

    setLoading(true)
    try {
      const data = await getUserMenuAccess(userId)
      setHiddenItems(data.hiddenItems)
      setRolePermissions(data.rolePermissions)
      setRoleName(data.roleName)
    } catch (error: any) {
      toast.error(error.message || "Failed to load menu access")
    } finally {
      setLoading(false)
    }
  }

  function isItemPermitted(permission: string | undefined): boolean {
    if (!permission) return true
    if (roleName === "Admin") return true
    const [module, action] = permission.split(":")
    return hasPermission(rolePermissions, module, action, roleName)
  }

  function toggleItem(href: string) {
    setHiddenItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    )
  }

  function selectAll() {
    setHiddenItems([])
  }

  function deselectAll() {
    const allPermittedHrefs = menuGroups
      .flatMap((g) => g.items)
      .filter((item) => isItemPermitted(item.permission))
      .map((item) => item.href)
    setHiddenItems(allPermittedHrefs)
  }

  async function handleSave() {
    if (!selectedUserId) return
    setSaving(true)
    try {
      await updateUserMenuAccess(selectedUserId, hiddenItems)
      toast.success("Menu access updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to update menu access")
    } finally {
      setSaving(false)
    }
  }

  const permittedCount = menuGroups
    .flatMap((g) => g.items)
    .filter((item) => isItemPermitted(item.permission)).length
  const visibleCount = permittedCount - hiddenItems.filter((href) =>
    menuGroups.flatMap((g) => g.items).some((item) => item.href === href && isItemPermitted(item.permission))
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Access"
        description="Customize which menu items each user can see"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="grid gap-2 flex-1 max-w-sm">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={handleSelectUser}>
                <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.username}) — {u.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{roleName}</Badge>
                <span className="text-sm text-muted-foreground">
                  {visibleCount} of {permittedCount} menu items visible
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && !loading && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Show All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Hide All
              </Button>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menuGroups.map((group) => {
              const permittedItems = group.items.filter((item) =>
                isItemPermitted(item.permission)
              )
              if (permittedItems.length === 0) return null

              return (
                <Card key={group.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2.5">
                      {group.items.map((item) => {
                        const permitted = isItemPermitted(item.permission)
                        const isVisible = permitted && !hiddenItems.includes(item.href)
                        const Icon = item.icon

                        return (
                          <label
                            key={item.href}
                            className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                              !permitted
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-pointer hover:bg-accent"
                            }`}
                          >
                            <Checkbox
                              checked={isVisible}
                              disabled={!permitted}
                              onCheckedChange={() => toggleItem(item.href)}
                            />
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{item.title}</span>
                          </label>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading menu access...
        </div>
      )}

      {!selectedUserId && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          Select a user to configure their menu access
        </div>
      )}
    </div>
  )
}
