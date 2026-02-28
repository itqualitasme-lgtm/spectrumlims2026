import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateCOAPDF } from "@/components/reports/coa-pdf"
import type { COAPDFProps } from "@/components/reports/coa-pdf"
import QRCode from "qrcode"
import crypto from "crypto"

function generateVerificationCode(): string {
  return crypto.randomBytes(12).toString("base64url")
}

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

    const { id } = await params
    const user = session.user as any

    // Fetch report with all related data including template and signatures
    const report = await db.report.findFirst({
      where: { id, labId: user.labId },
      include: {
        sample: {
          include: {
            client: true,
            sampleType: true,
            registration: {
              select: { _count: { select: { samples: { where: { deletedAt: null } } } } },
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

    // If no template assigned, try to use the default template
    let template = report.template
    if (!template) {
      template = await db.reportTemplate.findFirst({
        where: { labId: report.labId, isDefault: true },
      })
    }

    // Generate or retrieve verification record
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

    // Build verification URL
    const baseUrl = request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`
        : "http://localhost:3000"

    const verificationUrl = `${baseUrl}/verify/${verification.verificationCode}`

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#1e3a5f", light: "#ffffff" },
    })

    // Get the chemist who entered test results
    const testedByUser = report.sample.testResults.find(tr => tr.enteredBy)?.enteredBy
    const chemist = testedByUser || (report.sample.assignedTo ? {
      id: report.sample.assignedTo.id,
      name: report.sample.assignedTo.name,
    } : null)

    // Build props for the PDF component
    const pdfProps: COAPDFProps = {
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
