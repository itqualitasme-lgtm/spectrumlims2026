"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getPayments() {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const payments = await db.payment.findMany({
    where: { labId },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          invoiceType: true,
          total: true,
          status: true,
          client: { select: { id: true, name: true, company: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return payments
}

export async function getPayment(id: string) {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const payment = await db.payment.findFirst({
    where: { id, labId },
    include: {
      invoice: {
        include: {
          client: true,
          items: true,
        },
      },
      createdBy: { select: { name: true } },
      lab: true,
    },
  })

  return payment
}

export async function getUnpaidInvoices() {
  const session = await requirePermission("accounts", "view")
  const user = session.user as any
  const labId = user.labId

  const invoices = await db.invoice.findMany({
    where: {
      labId,
      deletedAt: null,
      invoiceType: "tax",
      status: { in: ["sent", "draft"] },
    },
    include: {
      client: { select: { id: true, name: true, company: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Calculate balance for each invoice
  return invoices.map((inv) => {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0)
    const balance = inv.total - totalPaid
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      client: inv.client,
      total: inv.total,
      totalPaid,
      balance,
      status: inv.status,
    }
  }).filter((inv) => inv.balance > 0)
}

export async function createPayment(data: {
  invoiceId: string
  amount: number
  paymentMethod: string
  referenceNumber?: string
  notes?: string
  paymentDate?: string
}) {
  const session = await requirePermission("accounts", "create")
  const user = session.user as any
  const labId = user.labId

  // Validate invoice
  const invoice = await db.invoice.findFirst({
    where: { id: data.invoiceId, labId, deletedAt: null },
    include: { payments: { select: { amount: true } } },
  })
  if (!invoice) throw new Error("Invoice not found")

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = invoice.total - totalPaid

  if (data.amount <= 0) throw new Error("Amount must be greater than zero")
  if (data.amount > balance + 0.01) throw new Error(`Amount exceeds balance of ${balance.toFixed(2)}`)

  const { formatted: receiptNumber } = await generateNextNumber(labId, "payment", "RCT")

  const payment = await db.payment.create({
    data: {
      receiptNumber,
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      createdById: user.id,
      labId,
    },
  })

  // Check if invoice is fully paid
  const newTotalPaid = totalPaid + data.amount
  if (newTotalPaid >= invoice.total - 0.01) {
    await db.invoice.update({
      where: { id: data.invoiceId },
      data: { status: "paid", paidDate: new Date() },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "create",
    `Recorded payment ${receiptNumber} of ${data.amount.toFixed(2)} for invoice ${invoice.invoiceNumber} via ${data.paymentMethod}`
  )

  revalidatePath("/accounts/payments")
  revalidatePath("/accounts/invoices")

  return payment
}

export async function deletePayment(id: string) {
  const session = await requirePermission("accounts", "delete")
  const user = session.user as any
  const labId = user.labId

  const payment = await db.payment.findFirst({
    where: { id, labId },
    include: {
      invoice: { include: { payments: { select: { id: true, amount: true } } } },
    },
  })
  if (!payment) throw new Error("Payment not found")

  // Delete the payment
  await db.payment.delete({ where: { id } })

  // Recalculate if invoice should revert from "paid" status
  const remainingPaid = payment.invoice.payments
    .filter((p) => p.id !== id)
    .reduce((sum, p) => sum + p.amount, 0)

  if (payment.invoice.status === "paid" && remainingPaid < payment.invoice.total - 0.01) {
    await db.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "sent", paidDate: null },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "accounts",
    "delete",
    `Deleted payment ${payment.receiptNumber} of ${payment.amount.toFixed(2)}`
  )

  revalidatePath("/accounts/payments")
  revalidatePath("/accounts/invoices")

  return payment
}
