import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateLabelPDF } from "@/components/reports/label-pdf"
import { format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = session.user as any
    const ids = request.nextUrl.searchParams.get("ids")

    if (!ids) {
      return NextResponse.json(
        { error: "Missing ids parameter" },
        { status: 400 }
      )
    }

    const sampleIds = ids.split(",").filter(Boolean)

    if (sampleIds.length === 0) {
      return NextResponse.json(
        { error: "No sample IDs provided" },
        { status: 400 }
      )
    }

    const samples = await db.sample.findMany({
      where: {
        id: { in: sampleIds },
        labId: user.labId,
      },
      include: {
        client: true,
        sampleType: true,
        lab: { select: { name: true } },
      },
      orderBy: { sampleNumber: "asc" },
    })

    if (samples.length === 0) {
      return NextResponse.json(
        { error: "No samples found" },
        { status: 404 }
      )
    }

    const labelSamples = samples.map((s) => ({
      id: s.id,
      sampleNumber: s.sampleNumber,
      clientName: s.client.company || s.client.name,
      sampleTypeName: s.sampleType.name,
      samplePoint: s.samplePoint,
      date: format(s.createdAt, "dd MMM yyyy"),
    }))

    // Build base URL from request headers
    const proto = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${proto}://${host}`

    const buffer = await generateLabelPDF({
      samples: labelSamples,
      labName: samples[0].lab.name,
      baseUrl,
    })

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Labels-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Error generating label PDF:", error?.message, error?.stack)
    return NextResponse.json(
      { error: "Failed to generate labels", detail: error?.message },
      { status: 500 }
    )
  }
}
