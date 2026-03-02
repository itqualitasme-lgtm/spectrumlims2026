"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber, generateLinkedNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getReports() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  const reports = await db.report.findMany({
    where: { labId, deletedAt: null, status: { in: ["approved", "published"] } },
    include: {
      sample: {
        include: {
          client: true,
          sampleType: true,
          assignedTo: { select: { id: true, name: true } },
          registration: { select: { id: true, registrationNumber: true } },
          testResults: {
            select: {
              id: true,
              parameter: true,
              testMethod: true,
              unit: true,
              resultValue: true,
              specMin: true,
              specMax: true,
              status: true,
              enteredById: true,
              enteredBy: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return reports
}

export async function getReportsForAuthentication() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  const reports = await db.report.findMany({
    where: { labId, deletedAt: null, status: { in: ["draft", "review", "revision"] } },
    include: {
      sample: {
        include: {
          client: true,
          sampleType: true,
          assignedTo: { select: { id: true, name: true } },
          registration: {
            select: {
              registrationNumber: true,
              reference: true,
              collectionDate: true,
              collectionLocation: true,
              samplingMethod: true,
              drawnBy: true,
              deliveredBy: true,
              sheetNumber: true,
              notes: true,
              registeredAt: true,
            },
          },
          testResults: {
            select: {
              id: true,
              parameter: true,
              testMethod: true,
              unit: true,
              resultValue: true,
              specMin: true,
              specMax: true,
              status: true,
              enteredById: true,
              enteredBy: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return reports
}

export async function getCompletedSamplesForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, status: "completed", deletedAt: null },
    include: {
      client: true,
      sampleType: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return samples.map((s) => ({
    id: s.id,
    sampleNumber: s.sampleNumber,
    clientName: s.client.company || s.client.name,
    typeName: s.sampleType.name,
  }))
}

export async function getReportTemplatesForSelect() {
  const session = await getSession()
  const user = session.user as any

  const templates = await db.reportTemplate.findMany({
    where: { labId: user.labId },
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })

  return templates
}

export async function updateReportTemplate(reportId: string, templateId: string | null) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any

  const report = await db.report.findFirst({ where: { id: reportId, labId: user.labId } })
  if (!report) throw new Error("Report not found")

  await db.report.update({
    where: { id: reportId },
    data: { templateId },
  })

  revalidatePath("/process/reports")
}

export async function createReport(data: {
  sampleId: string
  title: string
  summary?: string
  templateId?: string
}) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  // Use the sample's sequence number so report number matches sample number
  const sample = await db.sample.findFirst({
    where: { id: data.sampleId, labId },
    select: { sequenceNumber: true },
  })

  let reportNumber: string
  if (sample?.sequenceNumber) {
    reportNumber = await generateLinkedNumber(labId, "report", sample.sequenceNumber)
  } else {
    const result = await generateNextNumber(labId, "report", "SPL")
    reportNumber = result.formatted
  }

  const report = await db.report.create({
    data: {
      reportNumber,
      sampleId: data.sampleId,
      title: data.title,
      summary: data.summary || null,
      templateId: data.templateId || null,
      status: "draft",
      createdById: user.id,
      labId,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "create",
    `Created report ${reportNumber}`
  )

  revalidatePath("/process/reports")

  return report
}

export async function submitReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const report = await db.report.update({
    where: { id: reportId },
    data: { status: "review" },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Submitted report ${report.reportNumber} for authentication`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")

  return report
}

export async function approveReport(reportId: string, templateId?: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const updateData: any = {
    status: "approved",
    reviewedById: user.id,
    reviewedAt: new Date(),
  }

  if (templateId !== undefined) {
    updateData.templateId = templateId || null
  }

  const report = await db.report.update({
    where: { id: reportId },
    data: updateData,
  })

  // Also update sample status to "reported"
  const sample = await db.sample.update({
    where: { id: report.sampleId },
    data: { status: "reported" },
    include: {
      sampleType: { select: { name: true, defaultTests: true } },
      testResults: {
        select: { parameter: true, testMethod: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  // Auto-create draft proforma invoice for approved report
  const existingProformaItem = await db.invoiceItem.findFirst({
    where: { reportId: report.id },
  })
  if (!existingProformaItem) {
    try {
      let defaultTests: Array<{ parameter: string; method?: string; price?: number }> = []
      try {
        const parsed = JSON.parse(sample.sampleType.defaultTests || "[]")
        if (Array.isArray(parsed)) defaultTests = parsed
      } catch { /* ignore */ }

      const items = sample.testResults.map((tr) => {
        const match = defaultTests.find(
          (dt) => dt.parameter.toLowerCase() === tr.parameter.toLowerCase()
        )
        const unitPrice = match?.price || 0
        const desc = tr.testMethod ? `${tr.parameter} (${tr.testMethod})` : tr.parameter
        return {
          description: desc,
          quantity: 1,
          unitPrice,
          discount: 0,
          sampleId: sample.id,
          reportId: report.id,
        }
      })

      if (items.length > 0) {
        const { formatted: proformaNumber } = await generateNextNumber(labId, "proforma", "PRF")
        const subtotal = items.reduce((sum, i) => sum + i.unitPrice, 0)
        const taxRate = 5
        const taxAmount = subtotal * taxRate / 100
        const total = subtotal + taxAmount

        const proforma = await db.invoice.create({
          data: {
            invoiceNumber: proformaNumber,
            invoiceType: "proforma",
            clientId: sample.clientId,
            subtotal,
            discountTotal: 0,
            additionalCharges: 0,
            taxRate,
            taxAmount,
            total,
            status: "draft",
            createdById: user.id,
            labId,
            items: {
              create: items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total: item.unitPrice,
                sampleId: item.sampleId,
                reportId: item.reportId,
              })),
            },
          },
        })

        await logAudit(
          labId,
          user.id,
          user.name,
          "accounts",
          "create",
          `Auto-created proforma ${proformaNumber} for report ${report.reportNumber}`
        )
      }
    } catch {
      // Don't fail report approval if proforma creation fails
    }
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Authenticated report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")
  revalidatePath("/accounts/proforma")

  return report
}

export async function requestRevision(reportId: string, reason: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status: "revision",
      summary: `[Revision by ${user.name}]: ${reason}`,
      reviewedById: null,
      reviewedAt: null,
    },
  })

  // Cancel any draft proforma invoices auto-created for this report
  const linkedItems = await db.invoiceItem.findMany({
    where: { reportId },
    select: { invoiceId: true },
  })
  const invoiceIds = [...new Set(linkedItems.map((i) => i.invoiceId))]
  if (invoiceIds.length > 0) {
    // Only cancel draft proformas — don't touch sent/converted ones
    await db.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        invoiceType: "proforma",
        status: "draft",
      },
      data: { status: "cancelled" },
    })
    // Delete invoice items linked to this report from cancelled drafts
    // so a fresh proforma can be auto-created on re-approval
    const cancelledInvoices = await db.invoice.findMany({
      where: { id: { in: invoiceIds }, status: "cancelled" },
      select: { id: true },
    })
    if (cancelledInvoices.length > 0) {
      await db.invoiceItem.deleteMany({
        where: {
          reportId,
          invoiceId: { in: cancelledInvoices.map((i) => i.id) },
        },
      })
    }
  }

  // Set sample back to "testing" so chemist can correct results
  await db.sample.update({
    where: { id: report.sampleId },
    data: { status: "testing" },
  })

  // Reset completed test results back to pending so chemist can re-enter
  await db.testResult.updateMany({
    where: { sampleId: report.sampleId, status: "completed" },
    data: { status: "pending" },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Requested revision for report ${report.reportNumber}: ${reason}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/accounts/proforma")

  return report
}

export async function revertReportToRegistration(reportId: string, reason: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({
    where: { id: reportId, labId },
    include: { sample: true },
  })
  if (!existing) throw new Error("Report not found")

  const sampleId = existing.sampleId

  // Update report status to revision with registration revert note
  await db.report.update({
    where: { id: reportId },
    data: {
      status: "revision",
      summary: `[Reverted to Registration by ${user.name}]: ${reason}`,
      reviewedById: null,
      reviewedAt: null,
    },
  })

  // Cancel any draft proforma invoices auto-created for this report
  const linkedItems = await db.invoiceItem.findMany({
    where: { reportId },
    select: { invoiceId: true },
  })
  const revertInvoiceIds = [...new Set(linkedItems.map((i) => i.invoiceId))]
  if (revertInvoiceIds.length > 0) {
    await db.invoice.updateMany({
      where: {
        id: { in: revertInvoiceIds },
        invoiceType: "proforma",
        status: "draft",
      },
      data: { status: "cancelled" },
    })
    const cancelledInvoices = await db.invoice.findMany({
      where: { id: { in: revertInvoiceIds }, status: "cancelled" },
      select: { id: true },
    })
    if (cancelledInvoices.length > 0) {
      await db.invoiceItem.deleteMany({
        where: {
          reportId,
          invoiceId: { in: cancelledInvoices.map((i) => i.id) },
        },
      })
    }
  }

  // Reset sample to registered, clear assignment
  const existingNotes = existing.sample.notes || ""
  const revertNote = `[Reverted to Registration by ${user.name}: ${reason}]`
  const updatedNotes = existingNotes ? `${existingNotes}\n${revertNote}` : revertNote

  await db.sample.update({
    where: { id: sampleId },
    data: {
      status: "registered",
      assignedToId: null,
      notes: updatedNotes,
    },
  })

  // Reset all test results to pending and clear entered values
  await db.testResult.updateMany({
    where: { sampleId },
    data: {
      status: "pending",
      resultValue: null,
      enteredById: null,
      enteredAt: null,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Reverted report ${existing.reportNumber} to registration: ${reason}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/accounts/proforma")

  return existing
}

export async function publishReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const report = await db.report.update({
    where: { id: reportId },
    data: { status: "published", publishedAt: new Date() },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Published report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")

  return report
}

export async function deleteReport(reportId: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const report = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!report) throw new Error("Report not found")

  // Soft delete
  await db.report.update({
    where: { id: reportId },
    data: { deletedAt: new Date(), deletedById: user.id },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Deleted report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/trash/reports")

  return { success: true }
}
