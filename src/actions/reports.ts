"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
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
        },
      },
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
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
    where: { labId, status: "completed" },
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

export async function createReport(data: {
  sampleId: string
  title: string
  summary?: string
}) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  const reportNumber = await generateNextNumber(labId, "report", "RPT")

  const report = await db.report.create({
    data: {
      reportNumber,
      sampleId: data.sampleId,
      title: data.title,
      summary: data.summary || null,
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
    `Submitted report ${report.reportNumber} for review`
  )

  revalidatePath("/process/reports")

  return report
}

export async function approveReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const report = await db.report.update({
    where: { id: reportId },
    data: {
      status: "approved",
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Approved report ${report.reportNumber}`
  )

  revalidatePath("/process/reports")

  return report
}

export async function publishReport(reportId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const report = await db.report.update({
    where: { id: reportId },
    data: { status: "published" },
  })

  // Update sample status to "reported"
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

  const report = await db.report.findUnique({ where: { id: reportId } })
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
