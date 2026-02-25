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

export async function searchCustomers(query: string) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  if (!query || query.length < 1) return []

  const customers = await db.customer.findMany({
    where: {
      labId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, company: true, status: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 20,
  })

  return customers.map((c) => {
    const isInactive = c.status !== "active"
    const label = c.company ? `${c.name} - ${c.company}` : c.name
    return {
      value: c.id,
      label: isInactive ? `${label} (Inactive)` : label,
      disabled: isInactive,
      disabledReason: isInactive ? "Account Inactive" : undefined,
    }
  })
}

export async function getCustomerById(id: string) {
  const session = await getSession()
  const user = session.user as any

  const customer = await db.customer.findFirst({
    where: { id, labId: user.labId },
    select: { id: true, name: true, company: true },
  })

  if (!customer) return null

  return {
    value: customer.id,
    label: customer.company ? `${customer.name} - ${customer.company}` : customer.name,
  }
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
  collectionDate?: string
}) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  // Block registration for inactive customers
  const customer = await db.customer.findFirst({
    where: { id: data.clientId, labId },
    select: { status: true, name: true },
  })
  if (!customer) throw new Error("Customer not found")
  if (customer.status !== "active") {
    throw new Error(`Cannot register samples for inactive customer: ${customer.name}`)
  }

  const { formatted: sampleNumber, sequenceNumber } = await generateNextNumber(labId, "sample", "SPL")

  // Get sample type to parse default tests
  const sampleType = await db.sampleType.findUnique({
    where: { id: data.sampleTypeId },
  })

  // Determine collected by: explicit sampler ID, current user flag, or null
  const collectedById = data.collectedById || (data.collectedByCurrentUser ? user.id : null)

  // Use provided date/time or default to now
  const recordDate = data.collectionDate ? new Date(data.collectionDate) : new Date()

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
      registeredAt: recordDate,
      collectedById,
      collectionDate: recordDate,
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
        method?: string
        testMethod?: string
        unit?: string
        specMin?: string
        specMax?: string
        tat?: number
      }>

      if (Array.isArray(tests) && tests.length > 0) {
        // If selectedTests provided, only create those indices
        const selectedIndices = data.selectedTests
        const testsToCreate = selectedIndices
          ? tests.filter((_, i) => selectedIndices.includes(i))
          : tests

        if (testsToCreate.length > 0) {
          await db.testResult.createMany({
            data: testsToCreate.map((test) => {
              const tatDays = test.tat || null
              const dueDate = tatDays
                ? new Date(recordDate.getTime() + tatDays * 24 * 60 * 60 * 1000)
                : null
              return {
                sampleId: sample.id,
                parameter: test.parameter,
                testMethod: test.method || test.testMethod || null,
                unit: test.unit || null,
                specMin: test.specMin || null,
                specMax: test.specMax || null,
                tat: tatDays,
                dueDate,
                status: "pending",
              }
            }),
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

export async function updateSample(
  sampleId: string,
  data: {
    clientId: string
    sampleTypeId: string
    description?: string
    quantity?: string
    priority: string
    notes?: string
    jobType?: string
    reference?: string
    collectedById?: string
    collectionLocation?: string
    samplePoint?: string
    collectionDate?: string
  }
) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!existing) throw new Error("Sample not found")

  if (!["pending", "registered", "assigned"].includes(existing.status)) {
    throw new Error("Can only edit samples with pending, registered, or assigned status")
  }

  const recordDate = data.collectionDate ? new Date(data.collectionDate) : undefined

  const sample = await db.sample.update({
    where: { id: sampleId },
    data: {
      clientId: data.clientId,
      sampleTypeId: data.sampleTypeId,
      description: data.description || null,
      quantity: data.quantity || null,
      priority: data.priority,
      jobType: data.jobType || "testing",
      reference: data.reference || null,
      collectedById: data.collectedById || null,
      collectionLocation: data.collectionLocation || null,
      samplePoint: data.samplePoint || null,
      notes: data.notes || null,
      ...(recordDate && {
        registeredAt: recordDate,
        collectionDate: recordDate,
      }),
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Updated sample ${sample.sampleNumber}`
  )

  revalidatePath("/process/registration")
  revalidatePath(`/process/registration/${sampleId}`)
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
