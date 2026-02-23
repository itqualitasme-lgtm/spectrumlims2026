"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getRoles() {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const roles = await db.role.findMany({
    where: { labId: user.labId },
    include: {
      _count: {
        select: {
          users: true,
          rolePermissions: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const permissions = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  })

  return {
    roles: JSON.parse(JSON.stringify(roles)),
    permissions: JSON.parse(JSON.stringify(permissions)),
  }
}

export async function getRole(id: string) {
  const session = await getSession()
  const user = session.user as any

  const role = await db.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  })

  if (!role || role.labId !== user.labId) {
    throw new Error("Role not found")
  }

  return JSON.parse(JSON.stringify(role))
}

export async function createRole(data: {
  name: string
  permissionIds: string[]
}) {
  const session = await requirePermission("admin", "create")
  const user = session.user as any

  const role = await db.role.create({
    data: {
      name: data.name,
      labId: user.labId,
      rolePermissions: {
        create: data.permissionIds.map((permissionId) => ({
          permissionId,
        })),
      },
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "create",
    `Created role: ${role.name}`
  )

  revalidatePath("/admin/roles")
  return role
}

export async function updateRole(
  id: string,
  data: {
    name?: string
    permissionIds: string[]
  }
) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any

  const existing = await db.role.findUnique({
    where: { id },
  })

  if (!existing || existing.labId !== user.labId) {
    throw new Error("Role not found")
  }

  if (existing.isSystem) {
    throw new Error("System roles cannot be edited")
  }

  // Delete all existing role permissions
  await db.rolePermission.deleteMany({
    where: { roleId: id },
  })

  // Create new role permissions and update name if provided
  const updateData: any = {
    rolePermissions: {
      create: data.permissionIds.map((permissionId) => ({
        permissionId,
      })),
    },
  }

  if (data.name) {
    updateData.name = data.name
  }

  const role = await db.role.update({
    where: { id },
    data: updateData,
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "update",
    `Updated role: ${role.name}`
  )

  revalidatePath("/admin/roles")
  return role
}

export async function deleteRole(id: string) {
  const session = await requirePermission("admin", "delete")
  const user = session.user as any

  const existing = await db.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  })

  if (!existing || existing.labId !== user.labId) {
    throw new Error("Role not found")
  }

  if (existing.isSystem) {
    throw new Error("System roles cannot be deleted")
  }

  if (existing._count.users > 0) {
    throw new Error(
      `Cannot delete role. There are ${existing._count.users} user(s) assigned to this role.`
    )
  }

  const role = await db.role.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "delete",
    `Deleted role: ${role.name}`
  )

  revalidatePath("/admin/roles")
  return role
}
