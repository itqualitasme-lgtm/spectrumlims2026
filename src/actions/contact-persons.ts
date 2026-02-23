"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getContactPersons(customerId: string) {
  const session = await getSession()

  const contactPersons = await db.contactPerson.findMany({
    where: { customerId },
    orderBy: { name: "asc" },
  })

  return contactPersons
}

export async function createContactPerson(data: {
  customerId: string
  name: string
  email?: string
  phone?: string
  designation?: string
}) {
  const session = await requirePermission("masters", "create")
  const user = session.user as any

  const contactPerson = await db.contactPerson.create({
    data: {
      customerId: data.customerId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      designation: data.designation || null,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "create",
    `Added contact person: ${contactPerson.name} to customer ${data.customerId}`
  )

  revalidatePath(`/masters/customers/${data.customerId}`)
  return contactPerson
}

export async function updateContactPerson(
  id: string,
  data: {
    name?: string
    email?: string
    phone?: string
    designation?: string
    customerId: string
  }
) {
  const session = await requirePermission("masters", "edit")
  const user = session.user as any

  const contactPerson = await db.contactPerson.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      designation: data.designation || null,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "update",
    `Updated contact person: ${contactPerson.name}`
  )

  revalidatePath(`/masters/customers/${data.customerId}`)
  return contactPerson
}

export async function deleteContactPerson(id: string, customerId: string) {
  const session = await requirePermission("masters", "delete")
  const user = session.user as any

  const contactPerson = await db.contactPerson.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "customers",
    "delete",
    `Deleted contact person: ${contactPerson.name}`
  )

  revalidatePath(`/masters/customers/${customerId}`)
  return contactPerson
}
