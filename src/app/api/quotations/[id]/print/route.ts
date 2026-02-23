import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateQuotationPDF } from "@/components/reports/quotation-pdf"
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

  const quotation = await db.quotation.findFirst({
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

  if (!quotation) {
    return new Response("Quotation not found", { status: 404 })
  }

  const buffer = await generateQuotationPDF(quotation)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QUO-${quotation.quotationNumber}.pdf"`,
    },
  })
}
