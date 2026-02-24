"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

export async function getSamples() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId },
    include: {
      client: true,
      sampleType: true,
      assignedTo: { select: { name: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return samples
}

export async function getSample(id: string) {
  const session = await getSession()
  const user = session.user as any

  const sample = await db.sample.findFirst({
    where: { id, labId: user.labId },
    include: {
      client: true,
      sampleType: true,
      assignedTo: { select: { name: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      testResults: {
        include: {
          enteredBy: { select: { name: true } },
        },
      },
      reports: true,
    },
  })

  return sample
}

export async function getCustomersForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const customers = await db.customer.findMany({
    where: { labId, status: "active" },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  })

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
  }))
}

export async function getSampleTypesForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const sampleTypes = await db.sampleType.findMany({
    where: { labId, status: "active" },
    select: { id: true, name: true, defaultTests: true },
    orderBy: { name: "asc" },
  })

  return sampleTypes.map((st) => ({
    id: st.id,
    name: st.name,
    defaultTests: st.defaultTests,
  }))
}

export async function getChemistsForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const chemists = await db.user.findMany({
    where: {
      labId,
      isActive: true,
      role: {
        name: { in: ["Chemist", "Lab Manager", "Admin"] },
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return chemists.map((c) => ({
    id: c.id,
    name: c.name,
  }))
}

export async function getSamplersForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samplers = await db.user.findMany({
    where: {
      labId,
      isActive: true,
      role: {
        name: { in: ["Sampler", "Lab Manager", "Admin"] },
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return samplers.map((s) => ({
    id: s.id,
    name: s.name,
  }))
}

export async function createSample(data: {
  clientId: string
  sampleTypeId: string
  description?: string
  quantity?: string
  priority: string
  notes?: string
  jobType?: string
  reference?: string
  collectedByCurrentUser?: boolean
  collectedById?: string
  collectionLocation?: string
  samplePoint?: string
  selectedTests?: number[]
}) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  const { formatted: sampleNumber, sequenceNumber } = await generateNextNumber(labId, "sample", "SPL")

  // Get sample type to parse default tests
  const sampleType = await db.sampleType.findUnique({
    where: { id: data.sampleTypeId },
  })

  // Determine collected by: explicit sampler ID, current user flag, or null
  const collectedById = data.collectedById || (data.collectedByCurrentUser ? user.id : null)

  const sample = await db.sample.create({
    data: {
      sampleNumber,
      sequenceNumber,
      clientId: data.clientId,
      sampleTypeId: data.sampleTypeId,
      description: data.description || null,
      quantity: data.quantity || null,
      priority: data.priority,
      jobType: data.jobType || "testing",
      reference: data.reference || null,
      status: "registered",
      registeredById: user.id,
      registeredAt: new Date(),
      collectedById,
      collectionDate: collectedById ? new Date() : null,
      collectionLocation: data.collectionLocation || null,
      samplePoint: data.samplePoint || null,
      notes: data.notes || null,
      labId,
    },
  })

  // Parse defaultTests and create TestResult rows
  if (sampleType?.defaultTests) {
    try {
      const tests = JSON.parse(sampleType.defaultTests) as Array<{
        parameter: string
        testMethod?: string
        unit?: string
        specMin?: string
        specMax?: string
      }>

      if (Array.isArray(tests) && tests.length > 0) {
        // If selectedTests provided, only create those indices
        const selectedIndices = data.selectedTests
        const testsToCreate = selectedIndices
          ? tests.filter((_, i) => selectedIndices.includes(i))
          : tests

        if (testsToCreate.length > 0) {
          await db.testResult.createMany({
            data: testsToCreate.map((test) => ({
              sampleId: sample.id,
              parameter: test.parameter,
              testMethod: test.testMethod || null,
              unit: test.unit || null,
              specMin: test.specMin || null,
              specMax: test.specMax || null,
              status: "pending",
            })),
          })
        }
      }
    } catch {
      // If JSON parsing fails, skip test creation
    }
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "create",
    `Registered sample ${sampleNumber}`
  )

  revalidatePath("/process/registration")
  revalidatePath("/process/sample-collection")

  return sample
}

export async function assignSample(sampleId: string, assignedToId: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify sample belongs to this lab
  const existing = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!existing) throw new Error("Sample not found")

  const sample = await db.sample.update({
    where: { id: sampleId },
    data: {
      assignedToId,
      status: "assigned",
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Assigned sample ${sample.sampleNumber} to chemist`
  )

  revalidatePath("/process/registration")
  revalidatePath("/process/test-results")

  return sample
}

export async function updateSampleStatus(sampleId: string, status: string) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify sample belongs to this lab
  const existing = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!existing) throw new Error("Sample not found")

  const sample = await db.sample.update({
    where: { id: sampleId },
    data: { status },
  })

  revalidatePath("/process/registration")
  revalidatePath("/process/sample-collection")

  return sample
}

export async function deleteSample(sampleId: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const sample = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!sample) throw new Error("Sample not found")

  if (!["pending", "registered"].includes(sample.status)) {
    throw new Error("Can only delete samples with pending or registered status")
  }

  await db.sample.delete({ where: { id: sampleId } })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Deleted sample ${sample.sampleNumber}`
  )

  revalidatePath("/process/registration")
  revalidatePath("/process/sample-collection")

  return { success: true }
}

export async function getMyCollections() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, collectedById: user.id },
    include: {
      client: true,
      sampleType: true,
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return samples
}
