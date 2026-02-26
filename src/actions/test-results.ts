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

  // Show samples that are registered, assigned, testing, or recently completed
  const whereClause: any = {
    labId,
    deletedAt: null,
    status: { in: ["registered", "assigned", "testing", "completed"] },
  }

  // Chemists see unassigned (public) samples + their own assigned samples
  // Admin/Lab Manager see all
  if (roleName === "Chemist") {
    whereClause.OR = [
      { assignedToId: null },
      { assignedToId: user.id },
    ]
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
        orderBy: { parameter: "asc" },
      },
      reports: {
        where: { status: "revision" },
        select: {
          summary: true,
          status: true,
          reviewedBy: { select: { name: true } },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  })

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
        orderBy: { parameter: "asc" },
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
    orderBy: { parameter: "asc" },
  })

  return testResults
}

export async function batchUpdateTestResults(
  sampleId: string,
  results: { id: string; resultValue: string }[]
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

  // Check if all test results for this sample are now completed
  const pendingResults = await db.testResult.count({
    where: { sampleId, status: "pending" },
  })

  // Get the sample for logging
  const sample = await db.sample.findUnique({ where: { id: sampleId } })

  if (pendingResults === 0) {
    // All tests completed - update sample status to "completed"
    await db.sample.update({
      where: { id: sampleId },
      data: { status: "completed" },
    })

    // Auto-create a report if one doesn't already exist for this sample
    const existingReport = await db.report.findFirst({
      where: { sampleId, labId },
    })

    if (!existingReport) {
      // Get default template
      const defaultTemplate = await db.reportTemplate.findFirst({
        where: { labId, isDefault: true },
      })

      // Generate report number linked to sample sequence
      let reportNumber: string
      if (sample?.sequenceNumber) {
        reportNumber = await generateLinkedNumber(labId, "report", sample.sequenceNumber)
      } else {
        const result = await generateNextNumber(labId, "report", "RPT")
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
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!sample) throw new Error("Sample not found")

  const registeredAt = sample.registeredAt || sample.createdAt

  await db.testResult.createMany({
    data: tests.map((test) => {
      const tatDays = test.tat || null
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
        status: "pending",
      }
    }),
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Added ${tests.length} test parameter(s) to sample ${sample.sampleNumber}`
  )

  revalidatePath("/process/test-results")
  revalidatePath("/process/registration")
  revalidatePath(`/process/registration/${sampleId}`)

  return { success: true }
}

export async function deleteTestResult(testResultId: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const testResult = await db.testResult.findUnique({
    where: { id: testResultId },
    include: { sample: true },
  })

  if (!testResult || testResult.sample.labId !== labId) {
    throw new Error("Test result not found")
  }

  if (testResult.status === "completed") {
    throw new Error("Cannot delete a completed test result")
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
  revalidatePath(`/process/registration/${testResult.sampleId}`)

  return { success: true }
}
