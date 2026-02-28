import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateBatchCOAPDF } from "@/components/reports/coa-pdf"
import type { COAPDFProps } from "@/components/reports/coa-pdf"
import QRCode from "qrcode"
import crypto from "crypto"

function generateVerificationCode(): string {
  return crypto.randomBytes(12).toString("base64url")
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = session.user as any
    const ids = request.nextUrl.searchParams.get("ids")
    const registrationId = request.nextUrl.searchParams.get("registrationId")

    let reportIds: string[] = []

    if (registrationId) {
      // Fetch all reports for samples under this registration
      const regReports = await db.report.findMany({
        where: {
          labId: user.labId,
          status: { in: ["approved", "published"] },
          sample: { registrationId, deletedAt: null },
        },
        select: { id: true },
        orderBy: { sample: { subSampleNumber: "asc" } },
      })
      reportIds = regReports.map((r) => r.id)
    } else if (ids) {
      reportIds = ids.split(",").filter(Boolean)
    }

    if (reportIds.length === 0) {
      return NextResponse.json({ error: "No report IDs provided or no approved reports found" }, { status: 400 })
    }

    // Fetch all reports with full data
    const reports = await db.report.findMany({
      where: {
        id: { in: reportIds },
        labId: user.labId,
        status: { in: ["approved", "published"] },
      },
      include: {
        sample: {
          include: {
            client: true,
            sampleType: true,
            registration: {
              select: {
                samplingMethod: true,
                sheetNumber: true,
                _count: { select: { samples: { where: { deletedAt: null } } } },
              },
            },
            assignedTo: { select: { id: true, name: true, designation: true, signatureUrl: true } },
            testResults: {
              include: {
                enteredBy: { select: { id: true, name: true } },
              },
            },
          },
        },
        template: true,
        createdBy: {
          select: { id: true, name: true, designation: true, signatureUrl: true },
        },
        reviewedBy: {
          select: { id: true, name: true, designation: true, signatureUrl: true },
        },
        lab: true,
      },
      orderBy: { reportNumber: "asc" },
    })

    if (reports.length === 0) {
      return NextResponse.json({ error: "No approved/published reports found" }, { status: 404 })
    }

    // Build base URL
    const baseUrl = request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`
        : "http://localhost:3000"

    // Build props for each report
    const batchProps: COAPDFProps[] = await Promise.all(
      reports.map(async (report) => {
        // Get or create verification
        let verification = await db.reportVerification.findFirst({
          where: { reportId: report.id },
          orderBy: { createdAt: "desc" },
        })

        if (!verification) {
          const verificationCode = generateVerificationCode()
          verification = await db.reportVerification.create({
            data: {
              verificationCode,
              reportId: report.id,
              reportNumber: report.reportNumber,
              sampleNumber: report.sample.sampleNumber,
              clientName: report.sample.client.name,
              sampleType: report.sample.sampleType.name,
              testCount: report.sample.testResults.length,
              issuedAt: report.reviewedAt || report.createdAt,
              issuedBy: report.createdBy.name,
              labId: report.labId,
            },
          })
        }

        const verificationUrl = `${baseUrl}/verify/${verification.verificationCode}`

        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 200,
          margin: 1,
          color: { dark: "#1e3a5f", light: "#ffffff" },
        })

        // Get chemist
        const testedByUser = report.sample.testResults.find(tr => tr.enteredBy)?.enteredBy
        const chemist = testedByUser || (report.sample.assignedTo ? {
          id: report.sample.assignedTo.id,
          name: report.sample.assignedTo.name,
        } : null)

        // Get template
        let template = report.template
        if (!template) {
          template = await db.reportTemplate.findFirst({
            where: { labId: report.labId, isDefault: true },
          })
        }

        return {
          report: {
            id: report.id,
            reportNumber: report.reportNumber,
            reportType: report.reportType,
            title: report.title,
            summary: report.summary,
            remarks: report.remarks,
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
            sampleCondition: report.sample.sampleCondition,
            sampleCount: report.sample.registration?._count.samples || null,
            priority: report.sample.priority,
            status: report.sample.status,
            collectionDate: report.sample.collectionDate,
            collectionLocation: report.sample.collectionLocation,
            samplePoint: report.sample.samplePoint,
            reference: report.sample.reference,
            registeredAt: report.sample.registeredAt,
            notes: report.sample.notes,
            samplingMethod: report.sample.registration?.samplingMethod || null,
            sheetNumber: report.sample.registration?.sheetNumber || null,
            client: report.sample.client,
            sampleType: report.sample.sampleType,
            testResults: report.sample.testResults,
          },
          testedBy: chemist ? { id: chemist.id, name: chemist.name } : undefined,
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
            reportHeaderText: report.lab.reportHeaderText,
            reportFooterText: report.lab.reportFooterText,
          },
          customer: report.sample.client,
          template: template ? {
            headerText: template.headerText,
            footerText: template.footerText,
            logoUrl: template.logoUrl,
            accreditationLogoUrl: template.accreditationLogoUrl,
            accreditationText: template.accreditationText,
            isoLogoUrl: template.isoLogoUrl,
            sealUrl: template.sealUrl,
            showLabLogo: template.showLabLogo,
          } : null,
          qrCodeDataUrl,
          verificationCode: verification.verificationCode,
          verificationUrl,
        } as COAPDFProps
      })
    )

    const pdfBuffer = await generateBatchCOAPDF(batchProps)

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="COA-Batch-${new Date().toISOString().slice(0, 10)}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Error generating batch COA PDF:", error?.message, error?.stack)
    return NextResponse.json(
      { error: "Failed to generate batch COA", detail: error?.message },
      { status: 500 }
    )
  }
}
