import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generatePaymentReceiptPDF } from "@/components/reports/payment-receipt-pdf"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const user = session.user as any

  const payment = await db.payment.findFirst({
    where: { id, labId: user.labId },
    include: {
      invoice: {
        include: {
          client: true,
          payments: { select: { amount: true } },
        },
      },
      createdBy: { select: { name: true } },
      lab: true,
    },
  })

  if (!payment) {
    return new Response("Payment not found", { status: 404 })
  }

  const totalPaidOnInvoice = payment.invoice.payments.reduce(
    (sum, p) => sum + p.amount,
    0
  )

  const buffer = await generatePaymentReceiptPDF({
    receiptNumber: payment.receiptNumber,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber,
    notes: payment.notes,
    paymentDate: payment.paymentDate,
    createdBy: payment.createdBy,
    invoice: {
      invoiceNumber: payment.invoice.invoiceNumber,
      total: payment.invoice.total,
      status: payment.invoice.status,
      client: payment.invoice.client,
    },
    lab: payment.lab,
    totalPaidOnInvoice,
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payment.receiptNumber}.pdf"`,
    },
  })
}
