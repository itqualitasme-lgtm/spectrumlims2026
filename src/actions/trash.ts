"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getDeletedRegistrations() {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, deletedAt: { not: null } },
    include: {
      client: true,
      sampleType: true,
    },
    orderBy: { deletedAt: "desc" },
  })

  return samples
}

export async function getDeletedInvoices() {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const invoices = await db.invoice.findMany({
    where: { labId, deletedAt: { not: null } },
    include: {
      client: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { deletedAt: "desc" },
  })

  return invoices
}

export async function restoreSample(id: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id, labId, deletedAt: { not: null } },
  })
  if (!sample) throw new Error("Deleted sample not found")

  await db.sample.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Restored sample ${sample.sampleNumber} from trash`
  )

  revalidatePath("/process/trash/registrations")
  revalidatePath("/process/registration")

  return { success: true }
}

export async function restoreInvoice(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const invoice = await db.invoice.findFirst({
    where: { id, labId, deletedAt: { not: null } },
  })
  if (!invoice) throw new Error("Deleted invoice not found")

  await db.invoice.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "edit",
    `Restored invoice ${invoice.invoiceNumber} from trash`
  )

  revalidatePath("/accounts/trash/invoices")
  revalidatePath("/accounts/invoices")

  return { success: true }
}

export async function permanentDeleteSample(id: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id, labId, deletedAt: { not: null } },
  })
  if (!sample) throw new Error("Deleted sample not found")

  // Delete related test results first, then the sample
  await db.testResult.deleteMany({ where: { sampleId: id } })
  await db.sample.delete({ where: { id } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Permanently deleted sample ${sample.sampleNumber}`
  )

  revalidatePath("/process/trash/registrations")

  return { success: true }
}

export async function permanentDeleteInvoice(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const invoice = await db.invoice.findFirst({
    where: { id, labId, deletedAt: { not: null } },
  })
  if (!invoice) throw new Error("Deleted invoice not found")

  // Items cascade-delete from schema, just delete the invoice
  await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
  await db.invoice.delete({ where: { id } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "delete",
    `Permanently deleted invoice ${invoice.invoiceNumber}`
  )

  revalidatePath("/accounts/trash/invoices")

  return { success: true }
}
