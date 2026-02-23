import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateCOAPDF } from "@/components/reports/coa-pdf"
import type { COAPDFProps } from "@/components/reports/coa-pdf"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Await params (Next.js 16 pattern)
    const { id } = await params

    const user = session.user as any

    // Fetch report with all related data (filtered by labId for security)
    const report = await db.report.findFirst({
      where: { id, labId: user.labId },
      include: {
        sample: {
          include: {
            client: true,
            sampleType: true,
            testResults: true,
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
        lab: true,
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    // Validate report status
    if (report.status !== "published" && report.status !== "approved") {
      return NextResponse.json(
        { error: "Report must be approved or published to generate COA" },
        { status: 400 }
      )
    }

    // Build props for the PDF component
    const pdfProps: COAPDFProps = {
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        reportType: report.reportType,
        title: report.title,
        summary: report.summary,
        status: report.status,
        createdAt: report.createdAt,
        reviewedAt: report.reviewedAt,
        createdBy: report.createdBy,
        reviewedBy: report.reviewedBy,
      },
      sample: {
        id: report.sample.id,
        sampleNumber: report.sample.sampleNumber,
        description: report.sample.description,
        quantity: report.sample.quantity,
        priority: report.sample.priority,
        status: report.sample.status,
        collectionDate: report.sample.collectionDate,
        collectionLocation: report.sample.collectionLocation,
        notes: report.sample.notes,
        client: report.sample.client,
        sampleType: report.sample.sampleType,
        testResults: report.sample.testResults,
      },
      testResults: report.sample.testResults,
      lab: {
        id: report.lab.id,
        name: report.lab.name,
        code: report.lab.code,
        address: report.lab.address,
        phone: report.lab.phone,
        email: report.lab.email,
        website: report.lab.website,
        trn: report.lab.trn,
        logo: report.lab.logo,
      },
      customer: report.sample.client,
    }

    // Generate PDF buffer
    const pdfBuffer = await generateCOAPDF(pdfProps)

    // Return PDF response
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="COA-${report.reportNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Error generating COA PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate COA PDF" },
      { status: 500 }
    )
  }
}
