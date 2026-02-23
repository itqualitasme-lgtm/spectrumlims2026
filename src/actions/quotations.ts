"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getQuotations() {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const quotations = await db.quotation.findMany({
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

  return quotations
}

export async function getQuotation(id: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const quotation = await db.quotation.findFirst({
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

  return quotation
}

export async function getCustomersForQuotation() {
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

export async function getSamplesForQuotation(clientId: string) {
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

export async function createQuotation(data: {
  clientId: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    sampleId?: string
  }>
  validUntil?: string
  notes?: string
  taxRate?: number
}) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const taxRate = data.taxRate ?? 5

  const quotationNumber = await generateNextNumber(labId, "quotation", "QUO")

  // Calculate totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const taxAmount = subtotal * taxRate / 100
  const total = subtotal + taxAmount

  const quotation = await db.$transaction(async (tx) => {
    const quo = await tx.quotation.create({
      data: {
        quotationNumber,
        clientId: data.clientId,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: "draft",
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || null,
        createdById: user.id,
        labId,
      },
    })

    await tx.quotationItem.createMany({
      data: data.items.map((item) => ({
        quotationId: quo.id,
        sampleId: item.sampleId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    })

    return quo
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Created quotation ${quotationNumber}`
  )

  revalidatePath("/accounts/quotations")

  return quotation
}

export async function updateQuotationStatus(id: string, status: string) {
  const session = await requirePermission("accounts", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify quotation belongs to this lab
  const existing = await db.quotation.findFirst({ where: { id, labId } })
  if (!existing) throw new Error("Quotation not found")

  const updateData: any = { status }

  if (status === "accepted") {
    updateData.acceptedDate = new Date()
  }

  const quotation = await db.quotation.update({
    where: { id },
    data: updateData,
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "edit",
    `Updated quotation ${quotation.quotationNumber} status to ${status}`
  )

  revalidatePath("/accounts/quotations")

  return quotation
}

export async function deleteQuotation(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const quotation = await db.quotation.findFirst({ where: { id, labId } })
  if (!quotation) throw new Error("Quotation not found")

  if (quotation.status !== "draft") {
    throw new Error("Can only delete quotations with draft status")
  }

  await db.quotationItem.deleteMany({ where: { quotationId: id } })
  await db.quotation.delete({ where: { id } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "delete",
    `Deleted quotation ${quotation.quotationNumber}`
  )

  revalidatePath("/accounts/quotations")

  return { success: true }
}
