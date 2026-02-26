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
        collectedBy: { select: { name: true } },
        lab: { select: { name: true } },
      },
    })

    if (!sample) {
      return NextResponse.json(
        { error: "Sample not found" },
        { status: 404 }
      )
    }

    // Build base URL from request headers
    const proto = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${proto}://${host}`

    const collDate = sample.collectionDate || sample.createdAt
    const buffer = await generateLabelPDF({
      samples: [
        {
          id: sample.id,
          sampleNumber: sample.sampleNumber,
          clientName: sample.client.company || sample.client.name,
          sampleTypeName: sample.sampleType.name,
          samplePoint: sample.samplePoint,
          date: format(collDate, "dd MMM yyyy"),
          time: format(collDate, "HH:mm"),
          samplerName: sample.collectedBy?.name || null,
        },
      ],
      labName: sample.lab.name,
      baseUrl,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Label-${sample.sampleNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Error generating label PDF:", error?.message, error?.stack)
    return NextResponse.json(
      { error: "Failed to generate label", detail: error?.message },
      { status: 500 }
    )
  }
}
