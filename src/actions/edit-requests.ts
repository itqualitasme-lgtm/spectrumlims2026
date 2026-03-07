"use server"

import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

// ============= CREATE EDIT REQUEST =============

export async function createEditRequest(sampleId: string, reason: string) {
  const session = await requirePermission("process", "create")
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

// ============= SUBMIT EDIT FOR REVIEW (reported samples) =============

export type ProposedEditData = {
  sample: {
    clientId: string
    sampleTypeId: string
    jobType: string
    priority: string
    reference?: string
    description?: string
    collectedById?: string
    collectionLocation?: string
    samplePoint?: string
    quantity?: string
    notes?: string
    collectionDate?: string
  }
  registration?: {
    registrationId: string
    samplingMethod: string
    drawnBy?: string
    deliveredBy?: string
    sheetNumber?: string
    reference?: string
    collectionLocation?: string
    collectedById?: string
  }
}

export async function submitEditForReview(
  sampleId: string,
  proposedData: ProposedEditData
) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id: sampleId, labId },
    include: {
      client: { select: { name: true } },
      sampleType: { select: { name: true } },
      collectedBy: { select: { name: true } },
    },
  })
  if (!sample) throw new Error("Sample not found")

  // Check if there's already a pending request
  const existing = await db.editRequest.findFirst({
    where: { sampleId, labId, status: "pending" },
  })
  if (existing) throw new Error("An edit request is already pending for this sample")

  // Build human-readable changes for display
  const changes: { field: string; oldValue: string; newValue: string }[] = []
  const p = proposedData.sample

  if (p.clientId !== sample.clientId) {
    const newClient = await db.customer.findUnique({ where: { id: p.clientId }, select: { name: true } })
    changes.push({ field: "Client", oldValue: sample.client?.name || "-", newValue: newClient?.name || p.clientId })
  }
  if (p.sampleTypeId !== sample.sampleTypeId) {
    const newType = await db.sampleType.findUnique({ where: { id: p.sampleTypeId }, select: { name: true } })
    changes.push({ field: "Sample Type", oldValue: sample.sampleType?.name || "-", newValue: newType?.name || p.sampleTypeId })
  }
  if ((p.description || null) !== (sample.description || null)) {
    changes.push({ field: "Description", oldValue: sample.description || "-", newValue: p.description || "-" })
  }
  if ((p.quantity || null) !== (sample.quantity || null)) {
    changes.push({ field: "Quantity", oldValue: sample.quantity || "-", newValue: p.quantity || "-" })
  }
  if (p.priority !== sample.priority) {
    changes.push({ field: "Priority", oldValue: sample.priority, newValue: p.priority })
  }
  if ((p.jobType || "testing") !== (sample.jobType || "testing")) {
    changes.push({ field: "Job Type", oldValue: sample.jobType || "testing", newValue: p.jobType || "testing" })
  }
  if ((p.reference || null) !== (sample.reference || null)) {
    changes.push({ field: "Reference", oldValue: sample.reference || "-", newValue: p.reference || "-" })
  }
  if ((p.collectionLocation || null) !== (sample.collectionLocation || null)) {
    changes.push({ field: "Location", oldValue: sample.collectionLocation || "-", newValue: p.collectionLocation || "-" })
  }
  if ((p.samplePoint || null) !== (sample.samplePoint || null)) {
    changes.push({ field: "Sample Point", oldValue: sample.samplePoint || "-", newValue: p.samplePoint || "-" })
  }
  if ((p.notes || null) !== (sample.notes || null)) {
    changes.push({ field: "Notes", oldValue: sample.notes || "-", newValue: p.notes || "-" })
  }
  if ((p.collectedById || null) !== (sample.collectedById || null)) {
    let newName = "-"
    if (p.collectedById) {
      const u = await db.user.findUnique({ where: { id: p.collectedById }, select: { name: true } })
      newName = u?.name || p.collectedById
    }
    changes.push({ field: "Collected By", oldValue: sample.collectedBy?.name || "-", newValue: newName })
  }

  const reason = changes.length > 0
    ? `Edit ${changes.length} field(s): ${changes.map(c => c.field).join(", ")}`
    : "Edit submitted (no visible changes)"

  const request = await db.editRequest.create({
    data: {
      sampleId,
      requestedById: user.id,
      reason,
      changes: JSON.stringify(changes),
      proposedData: JSON.stringify(proposedData),
      labId,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Submitted edit for review on sample ${sample.sampleNumber}: ${reason}`
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
      sample: { select: { sampleNumber: true, assignedToId: true, registrationId: true } },
      requestedBy: { select: { name: true } },
    },
  })
  if (!request) throw new Error("Edit request not found or already processed")

  // If proposedData exists, apply the changes directly
  if (request.proposedData) {
    const proposed: ProposedEditData = JSON.parse(request.proposedData)
    const p = proposed.sample

    let recordDate: Date | undefined
    if (p.collectionDate) {
      const parsed = new Date(p.collectionDate)
      if (!isNaN(parsed.getTime())) recordDate = parsed
    }

    // Apply sample changes
    await db.sample.update({
      where: { id: request.sampleId },
      data: {
        clientId: p.clientId,
        sampleTypeId: p.sampleTypeId,
        description: p.description || null,
        quantity: p.quantity || null,
        priority: p.priority,
        jobType: p.jobType || "testing",
        reference: p.reference || null,
        collectedById: p.collectedById || null,
        collectionLocation: p.collectionLocation || null,
        samplePoint: p.samplePoint || null,
        notes: p.notes || null,
        ...(recordDate && {
          registeredAt: recordDate,
          collectionDate: recordDate,
        }),
      },
    })

    // Apply registration changes
    if (proposed.registration) {
      const r = proposed.registration
      const labInfo = await db.lab.findUnique({ where: { id: labId }, select: { code: true } })

      let formattedSheet: string | null | undefined = undefined
      if (r.sheetNumber !== undefined) {
        if (r.sheetNumber?.trim()) {
          const yearSuffix = String(new Date().getFullYear()).slice(-2)
          const labCode = labInfo?.code || "LAB"
          const raw = r.sheetNumber.trim()
          formattedSheet = raw.includes("-") ? raw : `${labCode}-${raw}-${yearSuffix}`
        } else {
          formattedSheet = null
        }
      }

      const regUpdate: Record<string, unknown> = {}
      if (r.samplingMethod) regUpdate.samplingMethod = r.samplingMethod
      if (r.drawnBy !== undefined) regUpdate.drawnBy = r.drawnBy || null
      if (r.deliveredBy !== undefined) regUpdate.deliveredBy = r.deliveredBy || null
      if (formattedSheet !== undefined) regUpdate.sheetNumber = formattedSheet
      if (r.reference !== undefined) regUpdate.reference = r.reference || null
      if (r.collectionLocation !== undefined) regUpdate.collectionLocation = r.collectionLocation || null
      if (r.collectedById !== undefined) {
        regUpdate.collectedBy = r.collectedById
          ? { connect: { id: r.collectedById } }
          : { disconnect: true }
      }

      await db.registration.update({
        where: { id: r.registrationId },
        data: regUpdate as any,
      })
    }

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

    // Set sample back to registered so it goes through testing again
    await db.sample.update({
      where: { id: request.sampleId },
      data: { status: "registered" },
    })

    // Mark request as approved
    await db.editRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    })

    await logAudit(
      labId,
      user.id,
      user.name,
      "process",
      "edit",
      `Approved and applied edit for sample ${request.sample.sampleNumber} (requested by ${request.requestedBy.name})${reports.length > 0 ? ` — ${reports.length} report(s) removed` : ""}`
    )
  } else {
    // Legacy flow: no proposedData — just approve and set status to "edit"
    await db.editRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    })

    await db.sample.update({
      where: { id: request.sampleId },
      data: { status: "edit" },
    })

    await logAudit(
      labId,
      user.id,
      user.name,
      "process",
      "edit",
      `Approved edit request for sample ${request.sample.sampleNumber} (requested by ${request.requestedBy.name})`
    )
  }

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
  const session = await requirePermission("process", "create")
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
