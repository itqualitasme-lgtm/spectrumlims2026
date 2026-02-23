import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateInvoicePDF } from "@/components/reports/invoice-pdf"
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

  const invoice = await db.invoice.findFirst({
    where: { id, labId: user.labId },
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

  if (!invoice) {
    return new Response("Invoice not found", { status: 404 })
  }

  const buffer = await generateInvoicePDF(invoice)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="INV-${invoice.invoiceNumber}.pdf"`,
    },
  })
}
