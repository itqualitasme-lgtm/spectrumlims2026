import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateLabelPDF } from "@/components/reports/label-pdf"
import { format } from "date-fns"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const user = session.user as any

    const sample = await db.sample.findFirst({
      where: { id, labId: user.labId },
      include: {
        client: true,
        sampleType: true,
        lab: { select: { name: true } },
      },
    })

    if (!sample) {
      return NextResponse.json(
        { error: "Sample not found" },
        { status: 404 }
      )
    }

    const buffer = await generateLabelPDF({
      samples: [
        {
          sampleNumber: sample.sampleNumber,
          clientName: sample.client.company || sample.client.name,
          sampleTypeName: sample.sampleType.name,
          samplePoint: sample.samplePoint,
          date: format(sample.createdAt, "dd MMM yyyy"),
        },
      ],
      labName: sample.lab.name,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Label-${sample.sampleNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error generating label PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate label" },
      { status: 500 }
    )
  }
}
