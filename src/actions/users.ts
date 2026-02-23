"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"

export async function getUsers() {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const users = await db.user.findMany({
    where: { labId: user.labId },
    include: {
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const portalUsers = await db.portalUser.findMany({
    where: { labId: user.labId },
    include: {
      customer: { select: { name: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return { users, portalUsers }
}

export async function getRoles() {
  const session = await getSession()
  const user = session.user as any

  const roles = await db.role.findMany({
    where: { labId: user.labId },
    orderBy: { name: "asc" },
  })

  return roles
}

export async function getCustomers() {
  const session = await getSession()
  const user = session.user as any

  const customers = await db.customer.findMany({
    where: { labId: user.labId, status: "active" },
    orderBy: { name: "asc" },
  })

  return customers
}

export async function createUser(data: {
  name: string
  email?: string
  username: string
  password: string
  phone?: string
  roleId: string
}) {
  const session = await requirePermission("admin", "create")
  const user = session.user as any

  // Check for duplicate username
  const existing = await db.user.findUnique({
    where: { username: data.username },
  })

  if (existing) {
    throw new Error("A user with this username already exists")
  }

  const passwordHash = await hash(data.password, 12)

  const newUser = await db.user.create({
    data: {
      name: data.name,
      email: data.email || null,
      username: data.username,
      passwordHash,
      phone: data.phone || null,
      roleId: data.roleId,
      labId: user.labId,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "create",
    `Created user: ${newUser.name} (${newUser.username})`
  )

  revalidatePath("/admin/users")
  return newUser
}

export async function updateUser(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    roleId?: string
    isActive?: boolean
    password?: string
  }
) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any

  const updateData: any = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    roleId: data.roleId,
    isActive: data.isActive,
  }

  if (data.password) {
    updateData.passwordHash = await hash(data.password, 12)
  }

  const updatedUser = await db.user.update({
    where: { id },
    data: updateData,
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "update",
    `Updated user: ${updatedUser.name} (${updatedUser.username})`
  )

  revalidatePath("/admin/users")
  return updatedUser
}

export async function deleteUser(id: string) {
  const session = await requirePermission("admin", "delete")
  const user = session.user as any

  // Can't delete yourself
  if (id === user.id) {
    throw new Error("You cannot delete your own account")
  }

  // Check if user has associated samples
  const sampleCount = await db.sample.count({
    where: {
      OR: [
        { assignedToId: id },
        { collectedById: id },
        { registeredById: id },
      ],
    },
  })

  if (sampleCount > 0) {
    throw new Error(
      `Cannot delete user. There are ${sampleCount} sample(s) associated with this user.`
    )
  }

  // Check if user has associated reports
  const reportCount = await db.report.count({
    where: {
      OR: [{ createdById: id }, { reviewedById: id }],
    },
  })

  if (reportCount > 0) {
    throw new Error(
      `Cannot delete user. There are ${reportCount} report(s) associated with this user.`
    )
  }

  const deletedUser = await db.user.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "delete",
    `Deleted user: ${deletedUser.name} (${deletedUser.username})`
  )

  revalidatePath("/admin/users")
  return deletedUser
}

export async function createPortalUser(data: {
  username: string
  password: string
  customerId: string
}) {
  const session = await requirePermission("admin", "create")
  const user = session.user as any

  // Check for duplicate username
  const existing = await db.portalUser.findUnique({
    where: { username: data.username },
  })

  if (existing) {
    throw new Error("A portal user with this username already exists")
  }

  const passwordHash = await hash(data.password, 12)

  const portalUser = await db.portalUser.create({
    data: {
      username: data.username,
      password: passwordHash,
      customerId: data.customerId,
      labId: user.labId,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "create",
    `Created portal user: ${portalUser.username}`
  )

  revalidatePath("/admin/users")
  return portalUser
}

export async function updatePortalUser(
  id: string,
  data: {
    isActive?: boolean
    password?: string
  }
) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any

  const updateData: any = {}

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive
  }

  if (data.password) {
    updateData.password = await hash(data.password, 12)
  }

  const portalUser = await db.portalUser.update({
    where: { id },
    data: updateData,
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "update",
    `Updated portal user: ${portalUser.username}`
  )

  revalidatePath("/admin/users")
  return portalUser
}

export async function deletePortalUser(id: string) {
  const session = await requirePermission("admin", "delete")
  const user = session.user as any

  const portalUser = await db.portalUser.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "admin",
    "delete",
    `Deleted portal user: ${portalUser.username}`
  )

  revalidatePath("/admin/users")
  return portalUser
}
