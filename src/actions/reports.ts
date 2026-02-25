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
    where: { labId },
    include: {
      sample: {
        include: {
          client: true,
          sampleType: true,
          assignedTo: { select: { id: true, name: true } },
          testResults: {
            select: { enteredById: true, enteredBy: { select: { id: true, name: true } } },
            where: { enteredById: { not: null } },
            take: 1,
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
    const result = await generateNextNumber(labId, "report", "RPT")
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

  return report
}

export async function approveReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status: "approved",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  })

  // Also update sample status to "reported"
  await db.sample.update({
    where: { id: report.sampleId },
    data: { status: "reported" },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Authenticated report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")
  revalidatePath("/process/registration")

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
      summary: reason,
    },
  })

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
  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")

  return report
}

export async function publishReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!existing) throw new Error("Report not found")

  const report = await db.report.update({
    where: { id: reportId },
    data: { status: "published" },
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
  revalidatePath("/process/registration")

  return report
}

export async function deleteReport(reportId: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const report = await db.report.findFirst({ where: { id: reportId, labId } })
  if (!report) throw new Error("Report not found")

  if (report.status !== "draft") {
    throw new Error("Can only delete reports with draft status")
  }

  await db.report.delete({ where: { id: reportId } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Deleted report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")

  return { success: true }
}
