"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getInvoices() {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const invoices = await db.invoice.findMany({
    where: { labId },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return invoices
}

export async function getInvoice(id: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const invoice = await db.invoice.findFirst({
    where: { id, labId },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      lab: true,
      items: {
        include: {
          sample: true,
        },
      },
    },
  })

  return invoice
}

export async function getCustomersForInvoice() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const customers = await db.customer.findMany({
    where: { labId, status: "active" },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  })

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }))
}

export async function getSamplesForInvoice(clientId: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, clientId },
    include: {
      sampleType: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return samples.map((s) => ({
    id: s.id,
    sampleNumber: s.sampleNumber,
    typeName: s.sampleType.name,
  }))
}

export async function createInvoice(data: {
  clientId: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    sampleId?: string
  }>
  dueDate?: string
  notes?: string
  taxRate?: number
}) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const taxRate = data.taxRate ?? 5

  const { formatted: invoiceNumber } = await generateNextNumber(labId, "invoice", "INV")

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const taxAmount = subtotal * taxRate / 100
  const total = subtotal + taxAmount

  const invoice = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: "draft",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        createdById: user.id,
        labId,
      },
    })

    await tx.invoiceItem.createMany({
      data: data.items.map((item) => ({
        invoiceId: inv.id,
        sampleId: item.sampleId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    })

    return inv
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Created invoice ${invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return invoice
}

export async function updateInvoiceStatus(id: string, status: string) {
  const session = await requirePermission("accounts", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify invoice belongs to this lab
  const existing = await db.invoice.findFirst({ where: { id, labId } })
  if (!existing) throw new Error("Invoice not found")

  const updateData: any = { status }

  if (status === "paid") {
    updateData.paidDate = new Date()
  }

  const invoice = await db.invoice.update({
    where: { id },
    data: updateData,
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "edit",
    `Updated invoice ${invoice.invoiceNumber} status to ${status}`
  )

  revalidatePath("/accounts/invoices")

  return invoice
}

export async function deleteInvoice(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const invoice = await db.invoice.findFirst({ where: { id, labId } })
  if (!invoice) throw new Error("Invoice not found")

  if (invoice.status !== "draft") {
    throw new Error("Can only delete invoices with draft status")
  }

  await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
  await db.invoice.delete({ where: { id } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "delete",
    `Deleted invoice ${invoice.invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return { success: true }
}
