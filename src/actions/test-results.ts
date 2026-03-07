"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber, generateLinkedNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getSamplesForTestEntry() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId
  const roleName = user.roleName

  // Show active samples (any date) + reported samples (last 5 days only)
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

  const whereClause: any = {
    labId,
    deletedAt: null,
    OR: [
      { status: { in: ["registered", "assigned", "testing", "completed"] } },
      { status: "reported", updatedAt: { gte: fiveDaysAgo } },
    ],
  }

  // Chemists see unassigned (public) samples + their own assigned samples
  // Admin/Lab Manager see all
  if (roleName === "Chemist") {
    whereClause.AND = [
      { OR: [{ assignedToId: null }, { assignedToId: user.id }] },
    ]
  }

  const samples = await db.sample.findMany({
    where: whereClause,
    include: {
      sampleType: true,
      client: true,
      assignedTo: { select: { name: true } },
      registration: { select: { id: true, registrationNumber: true, samplingMethod: true, drawnBy: true, deliveredBy: true, sheetNumber: true, isComposite: true } },
      testResults: {
        include: {
          enteredBy: { select: { name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      reports: {
        where: { deletedAt: null },
        select: {
          reportNumber: true,
          summary: true,
          status: true,
          createdById: true,
          reviewedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      editRequests: {
        where: { status: "approved" },
        select: {
          id: true,
          reason: true,
          changes: true,
          approvedAt: true,
          requestedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
        orderBy: { approvedAt: "desc" },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  })

  // For chemists, filter out revision samples that aren't assigned to or created by them
  if (roleName === "Chemist") {
    return samples.filter((s) => {
      const revisionReport = s.reports.find((r) => r.status === "revision")
      if (!revisionReport) return true // Not a revision — show normally
      // Only show revision samples to the assigned user or the report creator
      return s.assignedToId === user.id || revisionReport.createdById === user.id
    })
  }

  return samples
}

export async function getRegistrationGroups() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId
  const roleName = user.roleName

  const whereClause: any = {
    labId,
    deletedAt: null,
    status: { in: ["registered", "assigned", "testing", "completed"] },
  }

  if (roleName === "Chemist") {
    whereClause.assignedToId = user.id
  }

  const samples = await db.sample.findMany({
    where: whereClause,
    include: {
      sampleType: true,
      client: true,
      assignedTo: { select: { name: true } },
      testResults: {
        include: {
          enteredBy: { select: { name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by clientId + registeredAt (same registration session)
  const groupMap = new Map<string, typeof samples>()
  for (const sample of samples) {
    const regAt = sample.registeredAt?.toISOString() || sample.createdAt.toISOString()
    const key = `${sample.clientId}::${regAt}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(sample)
  }

  const groups = Array.from(groupMap.entries()).map(([key, groupSamples]) => {
    const first = groupSamples[0]
    const sampleCount = groupSamples.length
    const completedCount = groupSamples.filter((s) => s.status === "completed").length
    const allResultsEntered = groupSamples.every((s) =>
      s.testResults.length > 0 && s.testResults.every((tr) => tr.status === "completed")
    )

    // Group status
    let status = "pending"
    if (completedCount === sampleCount) status = "completed"
    else if (groupSamples.some((s) => s.status === "testing")) status = "testing"
    else if (groupSamples.some((s) => s.status === "assigned")) status = "assigned"

    return {
      key,
      clientId: first.clientId,
      clientName: first.client.company || first.client.name,
      reference: first.reference,
      registeredAt: first.registeredAt?.toISOString() || first.createdAt.toISOString(),
      location: first.collectionLocation,
      sampleCount,
      completedCount,
      allResultsEntered,
      status,
      samples: groupSamples,
    }
  })

  return groups
}

export async function getTestResults(sampleId: string) {
  const session = await getSession()
  const user = session.user as any

  // Verify sample belongs to this lab
  const sample = await db.sample.findFirst({ where: { id: sampleId, labId: user.labId } })
  if (!sample) throw new Error("Sample not found")

  const testResults = await db.testResult.findMany({
    where: { sampleId },
    include: {
      enteredBy: { select: { name: true } },
    },
    orderBy: { sortOrder: "asc" },
  })

  return testResults
}

export async function updateTestUnit(testResultId: string, unit: string) {
  const session = await requirePermission("process", "create")
  const user = session.user as any

  const testResult = await db.testResult.findUnique({
    where: { id: testResultId },
    include: { sample: { select: { labId: true } } },
  })
  if (!testResult || testResult.sample.labId !== user.labId) {
    throw new Error("Test result not found")
  }

  await db.testResult.update({
    where: { id: testResultId },
    data: { unit: unit.trim() || null },
  })

  revalidatePath("/process/registration")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/test-results")
}

export async function batchUpdateTestResults(
  sampleId: string,
  results: { id: string; resultValue: string }[],
  remarks?: string,
  unitUpdates?: { id: string; unit: string }[]
) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify sample belongs to this lab
  const sampleCheck = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!sampleCheck) throw new Error("Sample not found")

  // Auto-assign to current chemist if sample is unassigned
  if (!sampleCheck.assignedToId) {
    await db.sample.update({
      where: { id: sampleId },
      data: { assignedToId: user.id, status: "testing" },
    })
  }

  // Update each test result
  for (const result of results) {
    await db.testResult.update({
      where: { id: result.id },
      data: {
        resultValue: result.resultValue,
        status: "completed",
        enteredById: user.id,
        enteredAt: new Date(),
      },
    })
  }

  // Update units if provided
  if (unitUpdates && unitUpdates.length > 0) {
    for (const u of unitUpdates) {
      await db.testResult.update({
        where: { id: u.id },
        data: { unit: u.unit || null },
      })
    }
  }

  // Check if all test results for this sample are now completed
  const pendingResults = await db.testResult.count({
    where: { sampleId, status: "pending" },
  })

  // Get the sample for logging
  const sample = await db.sample.findUnique({ where: { id: sampleId } })

  // Check for existing active reports (exclude revision — those are historical)
  const activeReports = await db.report.findMany({
    where: { sampleId, labId, deletedAt: null, status: { not: "revision" } },
  })

  if (pendingResults === 0) {
    // All tests completed - update sample status to "completed"
    await db.sample.update({
      where: { id: sampleId },
      data: { status: "completed" },
    })

    // Auto-create a report if no active (non-revision) report exists
    if (activeReports.length === 0) {
      // Get default template
      const defaultTemplate = await db.reportTemplate.findFirst({
        where: { labId, isDefault: true },
      })

      // Generate report number linked to sample sequence
      let reportNumber: string
      if (sample?.sequenceNumber) {
        reportNumber = await generateLinkedNumber(labId, "report", sample.sequenceNumber)
      } else {
        const result = await generateNextNumber(labId, "report", "SPL")
        reportNumber = result.formatted
      }

      const sampleWithType = await db.sample.findUnique({
        where: { id: sampleId },
        include: { sampleType: true },
      })

      await db.report.create({
        data: {
          reportNumber,
          sampleId,
          title: `Certificate of Quality - ${sampleWithType?.sampleType.name || "Test Report"}`,
          templateId: defaultTemplate?.id || null,
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
        `Auto-created report ${reportNumber} for completed sample ${sample?.sampleNumber || sampleId}`
      )
    }
  } else {
    // Still has pending results - set to "testing" if it was "assigned" or "registered"
    if (sample?.status === "assigned" || sample?.status === "registered") {
      await db.sample.update({
        where: { id: sampleId },
        data: { status: "testing" },
      })
    }
  }

  // Save remarks on the active report if provided (exclude revision reports)
  if (remarks !== undefined) {
    const report = await db.report.findFirst({ where: { sampleId, labId, deletedAt: null, status: { not: "revision" } } })
    if (report) {
      await db.report.update({
        where: { id: report.id },
        data: { remarks },
      })
    }
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Updated ${results.length} test result(s) for sample ${sample?.sampleNumber || sampleId}`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")

  return { success: true }
}

export async function addTestsToSample(
  sampleId: string,
  tests: {
    parameter: string
    testMethod?: string
    unit?: string
    specMin?: string
    specMax?: string
    tat?: number
  }[]
) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!sample) throw new Error("Sample not found")

  const registeredAt = sample.registeredAt || sample.createdAt

  // Get the current max sortOrder for this sample
  const maxResult = await db.testResult.aggregate({
    where: { sampleId },
    _max: { sortOrder: true },
  })
  let nextOrder = (maxResult._max.sortOrder ?? -1) + 1

  await db.testResult.createMany({
    data: tests.map((test) => {
      const tatDays = test.tat || 3
      const dueDate = tatDays
        ? new Date(registeredAt.getTime() + tatDays * 24 * 60 * 60 * 1000)
        : null
      return {
        sampleId,
        parameter: test.parameter,
        testMethod: test.testMethod || null,
        unit: test.unit || null,
        specMin: test.specMin || null,
        specMax: test.specMax || null,
        tat: tatDays,
        dueDate,
        sortOrder: nextOrder++,
        status: "pending",
      }
    }),
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "create",
    `Added ${tests.length} test parameter(s) to sample ${sample.sampleNumber}`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath(`/process/registration/${sampleId}`)

  return { success: true }
}

export async function deleteTestResult(testResultId: string) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  const testResult = await db.testResult.findUnique({
    where: { id: testResultId },
    include: { sample: true },
  })

  if (!testResult || testResult.sample.labId !== labId) {
    throw new Error("Test result not found")
  }

  // Non-admin/non-lab-manager users can only delete pending tests
  if (testResult.status !== "pending" && user.roleName !== "Admin" && user.roleName !== "Lab Manager") {
    throw new Error("Only pending test parameters can be deleted")
  }

  await db.testResult.delete({ where: { id: testResultId } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Deleted test parameter "${testResult.parameter}" from sample ${testResult.sample.sampleNumber}`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")
  revalidatePath(`/process/registration/${testResult.sampleId}`)

  return { success: true }
}

// ============= REPORT REMARKS =============

export async function getReportRemarks(sampleId: string) {
  const session = await getSession()
  const user = session.user as any

  const report = await db.report.findFirst({
    where: { sampleId, labId: user.labId, deletedAt: null, status: { not: "revision" } },
    select: { remarks: true },
  })

  return report?.remarks || ""
}

export async function getPrefilledRemarks() {
  const session = await getSession()
  const user = session.user as any

  const remarks = await db.reportRemark.findMany({
    where: { labId: user.labId },
    orderBy: { text: "asc" },
  })

  return remarks.map((r) => ({ id: r.id, text: r.text }))
}

export async function createPrefilledRemark(text: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any

  const remark = await db.reportRemark.create({
    data: { text: text.trim(), labId: user.labId },
  })

  return { id: remark.id, text: remark.text }
}

export async function deletePrefilledRemark(id: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any

  const existing = await db.reportRemark.findFirst({ where: { id, labId: user.labId } })
  if (!existing) throw new Error("Remark not found")

  await db.reportRemark.delete({ where: { id } })
  return { success: true }
}

// ============= REVERT TO REGISTRATION =============

export async function revertToRegistration(sampleId: string, reason: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id: sampleId, labId },
  })

  if (!sample) throw new Error("Sample not found")

  // Reset sample status back to registered — keep results intact
  const existingNotes = sample.notes || ""
  const revertNote = `[Reverted by ${user.name}: ${reason}]`
  const updatedNotes = existingNotes ? `${existingNotes}\n${revertNote}` : revertNote

  await db.sample.update({
    where: { id: sampleId },
    data: {
      status: "registered",
      notes: updatedNotes,
    },
  })

  // Set existing reports to revision (historical) — keep them, don't delete
  const existingReports = await db.report.findMany({
    where: { sampleId, labId, deletedAt: null },
  })
  for (const report of existingReports) {
    await db.report.update({
      where: { id: report.id },
      data: { status: "revision", deletedAt: null },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Reverted sample ${sample.sampleNumber} to registration: ${reason} (results preserved, ${existingReports.length} report(s) set to revision)`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")

  return { success: true }
}

export async function revertToChemist(sampleId: string, reason: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({
    where: { id: sampleId, labId },
  })

  if (!sample) throw new Error("Sample not found")

  const existingNotes = sample.notes || ""
  const revertNote = `[Reverted to chemist by ${user.name}: ${reason}]`
  const updatedNotes = existingNotes ? `${existingNotes}\n${revertNote}` : revertNote

  // Set status back to testing — keep results intact
  await db.sample.update({
    where: { id: sampleId },
    data: {
      status: "testing",
      notes: updatedNotes,
    },
  })

  // Soft-delete any published/approved reports so they can be re-authenticated
  const existingReports = await db.report.findMany({
    where: { sampleId, labId, deletedAt: null },
  })
  for (const report of existingReports) {
    await db.report.update({
      where: { id: report.id },
      data: { status: "revision", deletedAt: null },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Reverted sample ${sample.sampleNumber} to chemist: ${reason}`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/reports")
  revalidatePath("/process/authentication")

  return { success: true }
}
