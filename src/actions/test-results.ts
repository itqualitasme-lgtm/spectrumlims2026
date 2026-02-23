"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getSamplesForTestEntry() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId
  const roleName = user.roleName

  // Chemists see only their assigned samples; Admin/Lab Manager see all
  const whereClause: any = {
    labId,
    status: { in: ["assigned", "testing"] },
  }

  if (roleName === "Chemist") {
    whereClause.assignedToId = user.id
  }

  const samples = await db.sample.findMany({
    where: whereClause,
    include: {
      sampleType: true,
      client: true,
      testResults: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return samples
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
  } else {
    // Still has pending results - set to "testing" if it was "assigned"
    const currentSample = await db.sample.findUnique({ where: { id: sampleId } })
    if (currentSample?.status === "assigned") {
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

  return { success: true }
}
