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
    where: { labId, deletedAt: null },
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
          report: { select: { reportNumber: true } },
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
    select: { id: true, name: true, company: true, paymentTerm: true },
    orderBy: { name: "asc" },
  })

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    paymentTerm: c.paymentTerm,
  }))
}

export async function getSamplesForInvoice(clientId: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, clientId, deletedAt: null },
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

export async function getReportsForInvoice(clientId: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const reports = await db.report.findMany({
    where: {
      labId,
      deletedAt: null,
      status: { in: ["approved", "published"] },
      sample: {
        clientId,
        deletedAt: null,
      },
    },
    include: {
      sample: {
        include: {
          sampleType: {
            select: { id: true, name: true, defaultTests: true },
          },
          testResults: {
            select: {
              id: true,
              parameter: true,
              testMethod: true,
              unit: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      invoiceItems: {
        select: { id: true },
      },
    },
    orderBy: { reportNumber: "asc" },
  })

  return reports.map((r) => {
    let defaultTests: Array<{ parameter: string; method?: string; unit?: string; price?: number }> = []
    try {
      const parsed = JSON.parse(r.sample.sampleType.defaultTests || "[]")
      if (Array.isArray(parsed)) defaultTests = parsed
    } catch { /* ignore */ }

    return {
      id: r.id,
      reportNumber: r.reportNumber,
      sampleId: r.sample.id,
      sampleNumber: r.sample.sampleNumber,
      sampleTypeName: r.sample.sampleType.name,
      sampleQuantity: r.sample.quantity,
      alreadyInvoiced: r.invoiceItems.length > 0,
      testResults: r.sample.testResults.map((tr) => ({
        id: tr.id,
        parameter: tr.parameter,
        testMethod: tr.testMethod,
        unit: tr.unit,
      })),
      defaultTests,
    }
  })
}

export async function createInvoice(data: {
  clientId: string
  invoiceType?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    discount?: number
    sampleId?: string
    reportId?: string
  }>
  dueDate?: string
  notes?: string
  taxRate?: number
}) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const taxRate = data.taxRate ?? 5
  const invoiceType = data.invoiceType || "tax"

  const module = invoiceType === "proforma" ? "proforma" : "invoice"
  const prefix = invoiceType === "proforma" ? "PRF" : "INV"
  const { formatted: invoiceNumber } = await generateNextNumber(labId, module, prefix)

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const discountTotal = data.items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0
  )
  const afterDiscount = subtotal - discountTotal
  const taxAmount = afterDiscount * taxRate / 100
  const total = afterDiscount + taxAmount

  const invoice = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        invoiceType,
        clientId: data.clientId,
        subtotal,
        discountTotal,
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
        reportId: item.reportId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: (item.quantity * item.unitPrice) - (item.discount || 0),
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
    `Created ${invoiceType} invoice ${invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return invoice
}

export async function updateInvoice(
  id: string,
  data: {
    clientId: string
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      discount?: number
      sampleId?: string
      reportId?: string
    }>
    dueDate?: string
    notes?: string
    taxRate?: number
  }
) {
  const session = await requirePermission("accounts", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.invoice.findFirst({ where: { id, labId, deletedAt: null } })
  if (!existing) throw new Error("Invoice not found")

  if (existing.status !== "draft") {
    throw new Error("Can only edit invoices with draft status")
  }

  const taxRate = data.taxRate ?? existing.taxRate
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )
  const discountTotal = data.items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0
  )
  const afterDiscount = subtotal - discountTotal
  const taxAmount = afterDiscount * taxRate / 100
  const total = afterDiscount + taxAmount

  const invoice = await db.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })

    const inv = await tx.invoice.update({
      where: { id },
      data: {
        clientId: data.clientId,
        subtotal,
        discountTotal,
        taxRate,
        taxAmount,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
      },
    })

    await tx.invoiceItem.createMany({
      data: data.items.map((item) => ({
        invoiceId: id,
        sampleId: item.sampleId || null,
        reportId: item.reportId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: (item.quantity * item.unitPrice) - (item.discount || 0),
      })),
    })

    return inv
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "edit",
    `Updated invoice ${invoice.invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return invoice
}

export async function updateInvoiceStatus(id: string, status: string) {
  const session = await requirePermission("accounts", "edit")
  const user = session.user as any
  const labId = user.labId

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

  await db.invoice.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  })

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

export async function convertProformaToTax(proformaId: string) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  const proforma = await db.invoice.findFirst({
    where: { id: proformaId, labId, deletedAt: null },
    include: { items: true },
  })

  if (!proforma) throw new Error("Proforma invoice not found")
  if (proforma.invoiceType !== "proforma") {
    throw new Error("Can only convert proforma invoices")
  }
  if (proforma.status === "converted" || proforma.status === "consolidated") {
    throw new Error("This proforma has already been converted")
  }

  const { formatted: invoiceNumber } = await generateNextNumber(labId, "invoice", "INV")

  const taxInvoice = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: "tax",
        clientId: proforma.clientId,
        subtotal: proforma.subtotal,
        discountTotal: proforma.discountTotal,
        taxRate: proforma.taxRate,
        taxAmount: proforma.taxAmount,
        total: proforma.total,
        status: "draft",
        dueDate: proforma.dueDate,
        notes: proforma.notes,
        createdById: user.id,
        labId,
      },
    })

    await tx.invoiceItem.createMany({
      data: proforma.items.map((item) => ({
        invoiceId: inv.id,
        sampleId: item.sampleId || null,
        reportId: item.reportId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })),
    })

    await tx.invoice.update({
      where: { id: proformaId },
      data: { status: "converted" },
    })

    return inv
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Converted proforma ${proforma.invoiceNumber} to tax invoice ${invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return taxInvoice
}

export async function consolidateProformas(proformaIds: string[]) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  if (proformaIds.length < 2) {
    throw new Error("Select at least 2 proforma invoices to consolidate")
  }

  const proformas = await db.invoice.findMany({
    where: { id: { in: proformaIds }, labId, deletedAt: null },
    include: { items: true },
  })

  if (proformas.length !== proformaIds.length) {
    throw new Error("Some proforma invoices were not found")
  }

  const clientIds = new Set(proformas.map((p) => p.clientId))
  if (clientIds.size > 1) {
    throw new Error("All proforma invoices must be from the same client")
  }

  for (const p of proformas) {
    if (p.invoiceType !== "proforma") {
      throw new Error(`Invoice ${p.invoiceNumber} is not a proforma`)
    }
    if (p.status === "converted" || p.status === "consolidated") {
      throw new Error(`Proforma ${p.invoiceNumber} has already been converted`)
    }
  }

  const allItems = proformas.flatMap((p) => p.items)
  const taxRate = proformas[0].taxRate
  const subtotal = allItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const discountTotal = allItems.reduce((sum, item) => sum + item.discount, 0)
  const afterDiscount = subtotal - discountTotal
  const taxAmount = afterDiscount * taxRate / 100
  const total = afterDiscount + taxAmount

  const { formatted: invoiceNumber } = await generateNextNumber(labId, "invoice", "INV")

  const taxInvoice = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: "tax",
        clientId: proformas[0].clientId,
        subtotal,
        discountTotal,
        taxRate,
        taxAmount,
        total,
        status: "draft",
        notes: `Consolidated from: ${proformas.map((p) => p.invoiceNumber).join(", ")}`,
        createdById: user.id,
        labId,
      },
    })

    await tx.invoiceItem.createMany({
      data: allItems.map((item) => ({
        invoiceId: inv.id,
        sampleId: item.sampleId || null,
        reportId: item.reportId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })),
    })

    await tx.invoice.updateMany({
      where: { id: { in: proformaIds } },
      data: { status: "consolidated" },
    })

    return inv
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Consolidated ${proformas.length} proformas into tax invoice ${invoiceNumber}`
  )

  revalidatePath("/accounts/invoices")

  return taxInvoice
}
