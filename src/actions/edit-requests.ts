"use server"

import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

// ============= CREATE EDIT REQUEST =============

export async function createEditRequest(sampleId: string, reason: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id: sampleId, labId },
    select: { sampleNumber: true },
  })
  if (!sample) throw new Error("Sample not found")

  // Check if there's already a pending request for this sample
  const existing = await db.editRequest.findFirst({
    where: { sampleId, labId, status: "pending" },
  })
  if (existing) throw new Error("An edit request is already pending for this sample")

  const request = await db.editRequest.create({
    data: {
      sampleId,
      requestedById: user.id,
      reason,
      labId,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "create",
    `Edit request for sample ${sample.sampleNumber}: ${reason}`
  )

  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")

  return request
}

// ============= APPROVE EDIT REQUEST =============

export async function approveEditRequest(requestId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const request = await db.editRequest.findFirst({
    where: { id: requestId, labId, status: "pending" },
    include: {
      sample: { select: { sampleNumber: true, assignedToId: true } },
      requestedBy: { select: { name: true } },
    },
  })
  if (!request) throw new Error("Edit request not found or already processed")

  // Approve the request
  await db.editRequest.update({
    where: { id: requestId },
    data: {
      status: "approved",
      approvedById: user.id,
      approvedAt: new Date(),
    },
  })

  // Set sample status to "edit" so registration team can identify it
  await db.sample.update({
    where: { id: request.sampleId },
    data: {
      status: "edit",
    },
  })

  // Reset test results to pending
  await db.testResult.updateMany({
    where: { sampleId: request.sampleId },
    data: {
      status: "pending",
      resultValue: null,
      enteredById: null,
      enteredAt: null,
    },
  })

  // Soft-delete any reports for this sample
  const reports = await db.report.findMany({
    where: { sampleId: request.sampleId, labId, deletedAt: null },
  })
  for (const report of reports) {
    await db.report.update({
      where: { id: report.id },
      data: { deletedAt: new Date(), deletedById: user.id },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Approved edit request for sample ${request.sample.sampleNumber} (requested by ${request.requestedBy.name})${reports.length > 0 ? ` — ${reports.length} report(s) removed` : ""}`
  )

  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")
  revalidatePath("/process/test-results")
  revalidatePath("/process/reports")

  return { success: true }
}

// ============= REJECT EDIT REQUEST =============

export async function rejectEditRequest(requestId: string, note?: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const request = await db.editRequest.findFirst({
    where: { id: requestId, labId, status: "pending" },
    include: {
      sample: { select: { sampleNumber: true } },
      requestedBy: { select: { name: true } },
    },
  })
  if (!request) throw new Error("Edit request not found or already processed")

  await db.editRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      approvedById: user.id,
      approvedAt: new Date(),
      rejectionNote: note || null,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Rejected edit request for sample ${request.sample.sampleNumber} (requested by ${request.requestedBy.name})${note ? `: ${note}` : ""}`
  )

  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")

  return { success: true }
}

// ============= GET PENDING EDIT REQUESTS =============

export async function getPendingEditRequests() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  return db.editRequest.findMany({
    where: { labId, status: { in: ["pending", "changes_submitted"] } },
    include: {
      sample: {
        select: {
          id: true,
          sampleNumber: true,
          status: true,
          client: { select: { id: true, name: true, company: true } },
          sampleType: { select: { name: true } },
          assignedTo: { select: { name: true } },
          registration: { select: { registrationNumber: true } },
        },
      },
      requestedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

// ============= ACKNOWLEDGE EDIT CHANGES =============

export async function acknowledgeEditChanges(requestId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const request = await db.editRequest.findFirst({
    where: { id: requestId, labId, status: "changes_submitted" },
    include: {
      sample: { select: { sampleNumber: true } },
      requestedBy: { select: { name: true } },
    },
  })
  if (!request) throw new Error("Edit request not found or not in changes_submitted status")

  // Mark as completed — changes acknowledged by authenticator
  await db.editRequest.update({
    where: { id: requestId },
    data: { status: "acknowledged" },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Acknowledged edit changes for sample ${request.sample.sampleNumber} (edited by ${request.requestedBy.name})`
  )

  revalidatePath("/process/authentication")
  revalidatePath("/process/registration")

  return { success: true }
}

// ============= GET EDIT REQUEST STATUS FOR SAMPLE =============

export async function getEditRequestStatus(sampleId: string) {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  return db.editRequest.findFirst({
    where: { sampleId, labId, status: { in: ["pending", "approved"] } },
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      approvedAt: true,
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}
