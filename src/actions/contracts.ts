"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getContracts() {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const contracts = await db.contract.findMany({
    where: { labId },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      quotation: { select: { quotationNumber: true } },
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return contracts
}

export async function getContract(id: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const contract = await db.contract.findFirst({
    where: { id, labId },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      quotation: { select: { quotationNumber: true } },
      lab: true,
      items: {
        include: {
          sample: true,
        },
      },
    },
  })

  return contract
}

export async function getCustomersForContract() {
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

export async function getSamplesForContract(clientId: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, clientId, deletedAt: null },
    include: { sampleType: true },
    orderBy: { createdAt: "desc" },
  })

  return samples.map((s) => ({
    id: s.id,
    sampleNumber: s.sampleNumber,
    typeName: s.sampleType.name,
  }))
}

export async function createContract(data: {
  clientId: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    sampleId?: string
  }>
  startDate?: string
  endDate?: string
  terms?: string
  notes?: string
  taxRate?: number
}) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const taxRate = data.taxRate ?? 5

  const { formatted: contractNumber } = await generateNextNumber(labId, "contract", "CON")

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const taxAmount = subtotal * taxRate / 100
  const total = subtotal + taxAmount

  const contract = await db.$transaction(async (tx) => {
    const con = await tx.contract.create({
      data: {
        contractNumber,
        clientId: data.clientId,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: "draft",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        terms: data.terms || null,
        notes: data.notes || null,
        createdById: user.id,
        labId,
      },
    })

    await tx.contractItem.createMany({
      data: data.items.map((item) => ({
        contractId: con.id,
        sampleId: item.sampleId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    })

    return con
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Created contract ${contractNumber}`
  )

  revalidatePath("/accounts/contracts")

  return contract
}

export async function updateContractStatus(id: string, status: string) {
  const session = await requirePermission("accounts", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.contract.findFirst({ where: { id, labId } })
  if (!existing) throw new Error("Contract not found")

  const contract = await db.contract.update({
    where: { id },
    data: { status },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "edit",
    `Updated contract ${contract.contractNumber} status to ${status}`
  )

  revalidatePath("/accounts/contracts")

  return contract
}

export async function deleteContract(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const contract = await db.contract.findFirst({ where: { id, labId } })
  if (!contract) throw new Error("Contract not found")

  if (contract.status !== "draft") {
    throw new Error("Can only delete contracts with draft status")
  }

  await db.contractItem.deleteMany({ where: { contractId: id } })
  await db.contract.delete({ where: { id } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "delete",
    `Deleted contract ${contract.contractNumber}`
  )

  revalidatePath("/accounts/contracts")

  return { success: true }
}

export async function convertQuotationToContract(quotationId: string) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, labId },
    include: { items: true },
  })

  if (!quotation) throw new Error("Quotation not found")
  if (quotation.status !== "accepted") {
    throw new Error("Can only convert accepted quotations to contracts")
  }

  const { formatted: contractNumber } = await generateNextNumber(labId, "contract", "CON")

  const contract = await db.$transaction(async (tx) => {
    const con = await tx.contract.create({
      data: {
        contractNumber,
        clientId: quotation.clientId,
        quotationId: quotation.id,
        subtotal: quotation.subtotal,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        total: quotation.total,
        status: "draft",
        notes: quotation.notes,
        createdById: user.id,
        labId,
      },
    })

    await tx.contractItem.createMany({
      data: quotation.items.map((item) => ({
        contractId: con.id,
        sampleId: item.sampleId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
    })

    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: "converted" },
    })

    return con
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Converted quotation ${quotation.quotationNumber} to contract ${contractNumber}`
  )

  revalidatePath("/accounts/contracts")
  revalidatePath("/accounts/quotations")

  return contract
}
