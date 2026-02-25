import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateContractPDF } from "@/components/reports/contract-pdf"
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

  const contract = await db.contract.findFirst({
    where: { id, labId: user.labId },
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

  if (!contract) {
    return new Response("Contract not found", { status: 404 })
  }

  const buffer = await generateContractPDF(contract)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="CON-${contract.contractNumber}.pdf"`,
    },
  })
}
