"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getCustomers() {
  const session = await requirePermission("masters", "view")
  const user = session.user as any

  const customers = await db.customer.findMany({
    where: { labId: user.labId },
    include: {
      _count: {
        select: { contactPersons: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return customers
}

export async function getCustomer(id: string) {
  const session = await getSession()
  const user = session.user as any

  const customer = await db.customer.findFirst({
    where: { id, labId: user.labId },
    include: {
      contactPersons: true,
    },
  })

  return customer
}

export async function createCustomer(data: {
  name: string
  email?: string
  company?: string
  phone?: string
  address?: string
  contactPerson?: string
  trn?: string
  paymentTerm?: string
}) {
  const session = await requirePermission("masters", "create")
  const user = session.user as any

  // Auto-generate customer code: SP-{first 3 letters of name}-{sequence}
  const namePrefix = data.name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")
  const count = await db.customer.count({ where: { labId: user.labId } })
  const code = `SP-${namePrefix}-${String(count + 1).padStart(3, "0")}`

  const customer = await db.customer.create({
    data: {
      code,
      name: data.name,
      email: data.email || null,
      company: data.company || null,
      phone: data.phone || null,
      address: data.address || null,
      contactPerson: data.contactPerson || null,
      trn: data.trn || null,
      paymentTerm: data.paymentTerm || null,
      labId: user.labId,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "create",
    `Created customer: ${customer.name} (${code})`
  )

  revalidatePath("/masters/customers")
  return customer
}

export async function updateCustomer(
  id: string,
  data: {
    name?: string
    email?: string
    company?: string
    phone?: string
    address?: string
    contactPerson?: string
    trn?: string
    paymentTerm?: string
    status?: string
  }
) {
  const session = await requirePermission("masters", "edit")
  const user = session.user as any

  // Verify customer belongs to this lab
  const existing = await db.customer.findFirst({ where: { id, labId: user.labId } })
  if (!existing) throw new Error("Customer not found")

  const customer = await db.customer.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || null,
      company: data.company || null,
      phone: data.phone || null,
      address: data.address || null,
      contactPerson: data.contactPerson || null,
      trn: data.trn || null,
      paymentTerm: data.paymentTerm || null,
      status: data.status,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "update",
    `Updated customer: ${customer.name} (${customer.code})`
  )

  revalidatePath("/masters/customers")
  revalidatePath(`/masters/customers/${id}`)
  return customer
}

export async function deleteCustomer(id: string) {
  const session = await requirePermission("masters", "delete")
  const user = session.user as any

  // Verify customer belongs to this lab
  const existing = await db.customer.findFirst({ where: { id, labId: user.labId } })
  if (!existing) throw new Error("Customer not found")

  // Check for associated samples
  const sampleCount = await db.sample.count({
    where: { clientId: id, labId: user.labId },
  })

  if (sampleCount > 0) {
    throw new Error(
      `Cannot delete customer. There are ${sampleCount} sample(s) associated with this customer.`
    )
  }

  const customer = await db.customer.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "delete",
    `Deleted customer: ${customer.name} (${customer.code})`
  )

  revalidatePath("/masters/customers")
  return customer
}
