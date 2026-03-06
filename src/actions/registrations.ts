"use server"

import { db } from "@/lib/db"
import { requirePermission, getSession } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { generateNextNumber } from "@/lib/auto-number"
import { revalidatePath } from "next/cache"

// ============= REGISTRATION (PARENT) =============

export async function createRegistration(data: {
  clientId: string
  jobType: string
  priority: string
  reference?: string
  collectedById?: string
  collectionLocation?: string
  collectionDate?: string
  sampleCondition?: string
  samplingMethod?: string
  drawnBy?: string
  deliveredBy?: string
  sheetNumber?: string
  notes?: string
  rows: {
    sampleTypeId: string
    qty: number
    bottleQty: string
    samplePoint?: string
    description?: string
    remarks?: string
    selectedTests: number[]
    orderedTests?: {
      parameter: string
      method?: string
      unit?: string
      specMin?: string
      specMax?: string
      tat?: number
    }[]
    customTests?: {
      parameter: string
      method?: string
      unit?: string
      specMin?: string
      specMax?: string
      tat?: number
    }[]
  }[]
}) {
  const session = await requirePermission("process", "create")
  const user = session.user as any
  const labId = user.labId

  // Block registration for inactive customers
  const [customer, lab] = await Promise.all([
    db.customer.findFirst({
      where: { id: data.clientId, labId },
      select: { status: true, name: true },
    }),
    db.lab.findUnique({ where: { id: labId }, select: { code: true } }),
  ])
  if (!customer) throw new Error("Customer not found")
  if (customer.status !== "active") {
    throw new Error(`Cannot register samples for inactive customer: ${customer.name}`)
  }

  // Format sheet number: user enters "252828" → stored as "SPL-LAB-252828-26"
  let formattedSheet: string | null = null
  if (data.sheetNumber?.trim()) {
    const yearSuffix = String(new Date().getFullYear()).slice(-2)
    const labCode = lab?.code || "LAB"
    const raw = data.sheetNumber.trim()
    // If already formatted (contains "-"), store as-is; otherwise auto-format
    formattedSheet = raw.includes("-") ? raw : `${labCode}-${raw}-${yearSuffix}`
  }

  // Generate registration number: REG-YYMMDD-NNN
  const { formatted: registrationNumber, sequenceNumber } = await generateNextNumber(labId, "registration", "REG")

  let recordDate = new Date()
  if (data.collectionDate) {
    const parsed = new Date(data.collectionDate)
    if (!isNaN(parsed.getTime())) recordDate = parsed
  }
  const collectedById = data.collectedById || null

  // Create the Registration parent
  const registration = await db.registration.create({
    data: {
      registrationNumber,
      sequenceNumber,
      clientId: data.clientId,
      jobType: data.jobType || "testing",
      priority: data.priority || "normal",
      reference: data.reference || null,
      collectionDate: recordDate,
      collectionLocation: data.collectionLocation || null,
      collectedById,
      registeredById: user.id,
      registeredAt: recordDate,
      samplingMethod: data.samplingMethod || "NP",
      drawnBy: data.drawnBy || "NP & Spectrum",
      deliveredBy: data.deliveredBy || null,
      sheetNumber: formattedSheet,
      notes: data.notes || null,
      labId,
    },
  })

  // Assign group letters: each unique sampleTypeId (in row order) gets A, B, C...
  const groupLetterMap = new Map<string, string>()
  let letterIdx = 0
  for (const row of data.rows) {
    if (!groupLetterMap.has(row.sampleTypeId)) {
      groupLetterMap.set(row.sampleTypeId, String.fromCharCode(65 + letterIdx)) // A, B, C...
      letterIdx++
    }
  }
  const hasMultipleGroups = groupLetterMap.size > 1

  // Track per-group sub-counter
  const groupCounters = new Map<string, number>()
  for (const letter of groupLetterMap.values()) {
    groupCounters.set(letter, 1)
  }

  let globalSubCounter = 1
  const createdSamples: { id: string; sampleNumber: string; sampleType: string; subSampleNumber: number; sampleGroup: string | null; samplePoint: string | null; bottleQty: string | null; description: string | null }[] = []

  for (const row of data.rows) {
    // Get sample type for tests
    const sampleType = await db.sampleType.findUnique({
      where: { id: row.sampleTypeId },
    })
    if (!sampleType) throw new Error("Sample type not found")

    // Build tests list: prefer orderedTests (pre-ordered by user), fall back to selectedTests + customTests
    const tests: Array<{
      parameter: string
      method?: string
      testMethod?: string
      unit?: string
      specMin?: string
      specMax?: string
      tat?: number
    }> = []

    if (row.orderedTests?.length) {
      // New flow: tests are already in the user's desired order
      for (const t of row.orderedTests) {
        if (t.parameter.trim()) tests.push(t)
      }
    } else {
      // Legacy flow: build from selectedTests indices + customTests
      try {
        const parsed = JSON.parse(sampleType.defaultTests)
        if (Array.isArray(parsed)) {
          for (const [i, t] of parsed.entries()) {
            if (row.selectedTests.includes(i)) tests.push(t)
          }
        }
      } catch {
        // skip
      }
      if (row.customTests?.length) {
        for (const ct of row.customTests) {
          if (ct.parameter.trim()) {
            tests.push({
              parameter: ct.parameter.trim(),
              method: ct.method || undefined,
              unit: ct.unit || undefined,
              specMin: ct.specMin || undefined,
              specMax: ct.specMax || undefined,
              tat: ct.tat || undefined,
            })
          }
        }
      }
    }

    const groupLetter = groupLetterMap.get(row.sampleTypeId)!
    const qty = Math.max(1, Math.min(99, row.qty))
    for (let b = 0; b < qty; b++) {
      const groupNum = groupCounters.get(groupLetter)!
      groupCounters.set(groupLetter, groupNum + 1)

      // Format: REG-260226-001-A01 (multi-group) or REG-260226-001-01 (single group)
      const subNum = hasMultipleGroups
        ? `${groupLetter}${String(groupNum).padStart(2, "0")}`
        : String(globalSubCounter).padStart(2, "0")
      const sampleNumber = `${registrationNumber}-${subNum}`

      const sample = await db.sample.create({
        data: {
          sampleNumber,
          clientId: data.clientId,
          sampleTypeId: row.sampleTypeId,
          description: row.description || null,
          quantity: row.bottleQty || null,
          sampleCondition: data.sampleCondition || null,
          priority: data.priority || "normal",
          jobType: data.jobType || "testing",
          reference: data.reference || null,
          status: "registered",
          registeredById: user.id,
          registeredAt: recordDate,
          collectedById,
          collectionDate: recordDate,
          collectionLocation: data.collectionLocation || null,
          samplePoint: row.samplePoint || null,
          notes: row.remarks || null,
          registrationId: registration.id,
          subSampleNumber: globalSubCounter,
          sampleGroup: hasMultipleGroups ? groupLetter : null,
          labId,
        },
      })

      // Create test results for this sub-sample
      if (tests.length > 0) {
        await db.testResult.createMany({
          data: tests.map((test, idx) => {
            const tatDays = test.tat || 3
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
              sortOrder: idx,
              status: "pending",
            }
          }),
        })
      }

      createdSamples.push({
        id: sample.id,
        sampleNumber: sample.sampleNumber,
        sampleType: sampleType.name,
        subSampleNumber: globalSubCounter,
        sampleGroup: hasMultipleGroups ? groupLetter : null,
        samplePoint: row.samplePoint || null,
        bottleQty: row.bottleQty || null,
        description: row.description || null,
      })
      globalSubCounter++
    }
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "create",
    `Registered ${registrationNumber} with ${createdSamples.length} samples`
  )

  revalidatePath("/process/registration")
  revalidatePath("/process/sample-collection")

  return {
    registrationId: registration.id,
    registrationNumber,
    samples: createdSamples,
  }
}

export async function getRegistration(id: string) {
  const session = await getSession()
  const user = session.user as any

  const registration = await db.registration.findFirst({
    where: { id, labId: user.labId },
    include: {
      client: { select: { name: true, company: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      samples: {
        where: { deletedAt: null },
        include: {
          sampleType: { select: { name: true } },
          _count: { select: { testResults: true } },
          testResults: { select: { status: true } },
          reports: { select: { id: true, status: true }, take: 1 },
        },
        orderBy: { subSampleNumber: "asc" },
      },
    },
  })

  return registration
}

// ============= REGISTRATIONS LIST =============

export async function getRegistrations() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  const registrations = await db.registration.findMany({
    where: { labId },
    include: {
      client: { select: { id: true, name: true, company: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      samples: {
        where: { deletedAt: null },
        include: {
          sampleType: { select: { name: true } },
          assignedTo: { select: { name: true } },
          editRequests: {
            where: { status: "pending" },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { subSampleNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Filter out registrations with no active samples (all soft-deleted)
  const activeRegistrations = registrations.filter((reg) => reg.samples.length > 0)

  return activeRegistrations.map((reg) => {
    // Aggregate sample types with counts
    const typeMap = new Map<string, number>()
    for (const s of reg.samples) {
      const name = s.sampleType.name
      typeMap.set(name, (typeMap.get(name) || 0) + 1)
    }
    const sampleTypes = Array.from(typeMap.entries()).map(([name, count]) =>
      typeMap.size > 1 ? `${name} (${count})` : name
    ).join(", ")

    // Aggregate statuses
    const statuses = reg.samples.map((s) => s.status)
    const allSame = statuses.length > 0 && statuses.every((s) => s === statuses[0])
    const overallStatus = allSame ? statuses[0] : "mixed"

    // Check if any sample is assigned
    const assignedNames = [...new Set(reg.samples.filter((s) => s.assignedTo).map((s) => s.assignedTo!.name))]

    return {
      id: reg.id,
      registrationNumber: reg.registrationNumber,
      client: { id: reg.client.id, name: reg.client.name, company: reg.client.company },
      sampleTypes,
      sampleCount: reg.samples.length,
      priority: reg.priority,
      jobType: reg.jobType,
      collectionLocation: reg.collectionLocation,
      assignedTo: assignedNames.length > 0 ? assignedNames.join(", ") : null,
      status: overallStatus,
      sheetNumber: reg.sheetNumber || null,
      createdAt: reg.createdAt.toISOString(),
      editRequested: reg.samples.some((s) => s.editRequests.length > 0),
      samples: reg.samples.map((s) => ({
        id: s.id,
        sampleNumber: s.sampleNumber,
        status: s.status,
      })),
    }
  })
}

// ============= SAMPLES =============

export async function getSamples() {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, deletedAt: null },
    include: {
      client: true,
      sampleType: true,
      assignedTo: { select: { name: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      registration: { select: { id: true, registrationNumber: true } },
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
      registration: {
        include: {
          samples: {
            where: { deletedAt: null },
            select: { id: true, sampleNumber: true, subSampleNumber: true, status: true, samplePoint: true, quantity: true, description: true, sampleGroup: true },
            orderBy: { subSampleNumber: "asc" },
          },
        },
      },
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
      status: "active",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
    take: 20,
  })

  return customers.map((c) => ({
    value: c.id,
    label: c.company ? `${c.name} - ${c.company}` : c.name,
  }))
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

export async function getCustomerAddress(id: string) {
  const session = await getSession()
  const user = session.user as any

  const customer = await db.customer.findFirst({
    where: { id, labId: user.labId },
    select: { address: true },
  })

  return customer?.address || null
}

export async function getSampleTypesForSelect() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const sampleTypes = await db.sampleType.findMany({
    where: { labId, status: "active" },
    select: { id: true, name: true, specificationStandard: true, defaultTests: true },
    orderBy: { name: "asc" },
  })

  return sampleTypes.map((st) => ({
    id: st.id,
    name: st.name,
    specificationStandard: st.specificationStandard,
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
        name: "Sampler",
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
  let recordDate = new Date()
  if (data.collectionDate) {
    const parsed = new Date(data.collectionDate)
    if (!isNaN(parsed.getTime())) recordDate = parsed
  }

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
              const tatDays = test.tat || 3
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

  const existing = await db.sample.findFirst({
    where: { id: sampleId, labId },
    include: {
      testResults: { select: { status: true } },
      client: { select: { name: true } },
      sampleType: { select: { name: true } },
      collectedBy: { select: { name: true } },
    },
  })
  if (!existing) throw new Error("Sample not found")

  // If sample is in a completed/reported state but NOT in "edit" status, auto-create an edit request
  const isProtected = ["completed", "reported"].includes(existing.status)
  const isEditApproved = existing.status === "edit"

  if (isProtected && !isEditApproved) {
    throw new Error("Cannot edit: sample is completed/reported. Request edit permission first.")
  }

  let recordDate: Date | undefined
  if (data.collectionDate) {
    const parsed = new Date(data.collectionDate)
    if (!isNaN(parsed.getTime())) {
      recordDate = parsed
    }
  }

  // Track changes if this is an approved edit (status === "edit")
  if (isEditApproved) {
    const changes: { field: string; oldValue: string; newValue: string }[] = []

    // Compare fields and track differences
    const comparisons: { field: string; oldVal: string | null; newVal: string | null }[] = [
      { field: "Client", oldVal: existing.client?.name || null, newVal: null }, // resolved below
      { field: "Sample Type", oldVal: existing.sampleType?.name || null, newVal: null }, // resolved below
      { field: "Description", oldVal: existing.description, newVal: data.description || null },
      { field: "Quantity", oldVal: existing.quantity, newVal: data.quantity || null },
      { field: "Priority", oldVal: existing.priority, newVal: data.priority },
      { field: "Job Type", oldVal: existing.jobType, newVal: data.jobType || "testing" },
      { field: "Reference", oldVal: existing.reference, newVal: data.reference || null },
      { field: "Collection Location", oldVal: existing.collectionLocation, newVal: data.collectionLocation || null },
      { field: "Sample Point", oldVal: existing.samplePoint, newVal: data.samplePoint || null },
      { field: "Notes", oldVal: existing.notes, newVal: data.notes || null },
    ]

    // Resolve client and sample type names for comparison
    if (data.clientId !== existing.clientId) {
      const newClient = await db.customer.findUnique({ where: { id: data.clientId }, select: { name: true } })
      comparisons[0].newVal = newClient?.name || data.clientId
    } else {
      comparisons[0].newVal = existing.client?.name || null
    }
    if (data.sampleTypeId !== existing.sampleTypeId) {
      const newType = await db.sampleType.findUnique({ where: { id: data.sampleTypeId }, select: { name: true } })
      comparisons[1].newVal = newType?.name || data.sampleTypeId
    } else {
      comparisons[1].newVal = existing.sampleType?.name || null
    }

    // Collector name
    if ((data.collectedById || null) !== (existing.collectedById || null)) {
      const oldName = existing.collectedBy?.name || "-"
      let newName = "-"
      if (data.collectedById) {
        const newCollector = await db.user.findUnique({ where: { id: data.collectedById }, select: { name: true } })
        newName = newCollector?.name || data.collectedById
      }
      changes.push({ field: "Collected By", oldValue: oldName, newValue: newName })
    }

    // Collection date
    if (recordDate) {
      const oldDate = existing.collectionDate ? existing.collectionDate.toISOString().split("T")[0] : "-"
      const newDate = recordDate.toISOString().split("T")[0]
      if (oldDate !== newDate) {
        changes.push({ field: "Collection Date", oldValue: oldDate, newValue: newDate })
      }
    }

    for (const c of comparisons) {
      const old = (c.oldVal || "").trim()
      const nw = (c.newVal || "").trim()
      if (old !== nw) {
        changes.push({ field: c.field, oldValue: old || "-", newValue: nw || "-" })
      }
    }

    // Store changes on the approved edit request
    if (changes.length > 0) {
      const editRequest = await db.editRequest.findFirst({
        where: { sampleId, labId, status: "approved" },
        orderBy: { createdAt: "desc" },
      })
      if (editRequest) {
        await db.editRequest.update({
          where: { id: editRequest.id },
          data: {
            changes: JSON.stringify(changes),
            status: "changes_submitted",
          },
        })
      }
    }
  }

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

  // If sample was in "edit" status, set to "registered" (will go through testing again)
  if (isEditApproved) {
    await db.sample.update({
      where: { id: sampleId },
      data: { status: "registered" },
    })
  }

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Updated sample ${sample.sampleNumber}${isEditApproved ? " (approved edit)" : ""}`
  )

  revalidatePath("/process/registration")
  revalidatePath(`/process/registration/${sampleId}`)
  revalidatePath("/process/sample-collection")
  revalidatePath("/process/authentication")

  return sample
}

export async function updateRegistration(
  registrationId: string,
  data: {
    samplingMethod?: string
    drawnBy?: string
    deliveredBy?: string
    sheetNumber?: string
    reference?: string
    collectionLocation?: string
    collectedById?: string
    notes?: string
  }
) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  const [existing, labInfo] = await Promise.all([
    db.registration.findFirst({ where: { id: registrationId, labId } }),
    db.lab.findUnique({ where: { id: labId }, select: { code: true } }),
  ])
  if (!existing) throw new Error("Registration not found")

  // Format sheet number if provided
  let formattedSheet: string | null | undefined = undefined
  if (data.sheetNumber !== undefined) {
    if (data.sheetNumber?.trim()) {
      const yearSuffix = String(new Date().getFullYear()).slice(-2)
      const labCode = labInfo?.code || "LAB"
      const raw = data.sheetNumber.trim()
      formattedSheet = raw.includes("-") ? raw : `${labCode}-${raw}-${yearSuffix}`
    } else {
      formattedSheet = null
    }
  }

  const registration = await db.registration.update({
    where: { id: registrationId },
    data: {
      samplingMethod: data.samplingMethod || "NP",
      drawnBy: data.drawnBy !== undefined ? (data.drawnBy || "NP & Spectrum") : undefined,
      deliveredBy: data.deliveredBy !== undefined ? (data.deliveredBy || null) : undefined,
      sheetNumber: formattedSheet,
      reference: data.reference !== undefined ? (data.reference || null) : undefined,
      collectionLocation: data.collectionLocation !== undefined ? (data.collectionLocation || null) : undefined,
      collectedById: data.collectedById !== undefined ? (data.collectedById || null) : undefined,
      notes: data.notes !== undefined ? (data.notes || null) : undefined,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Updated registration ${registration.registrationNumber}`
  )

  revalidatePath("/process/registration")
  revalidatePath(`/process/registration/${registrationId}`)

  return registration
}

export async function assignSample(sampleId: string, assignedToId: string | null) {
  const session = await requirePermission("process", "edit")
  const user = session.user as any
  const labId = user.labId

  // Verify sample belongs to this lab
  const existing = await db.sample.findFirst({ where: { id: sampleId, labId } })
  if (!existing) throw new Error("Sample not found")

  // Only update status if sample hasn't progressed beyond registration
  const shouldUpdateStatus = ["pending", "registered"].includes(existing.status)
  const sample = await db.sample.update({
    where: { id: sampleId },
    data: {
      assignedToId: assignedToId || null,
      ...(shouldUpdateStatus ? { status: assignedToId ? "assigned" : "registered" } : {}),
    },
  })

  const assignLabel = assignedToId ? "chemist" : "public (all chemists)"
  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "edit",
    `Assigned sample ${sample.sampleNumber} to ${assignLabel}`
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

  // Soft delete - any status can be deleted
  await db.sample.update({
    where: { id: sampleId },
    data: { deletedAt: new Date(), deletedById: user.id },
  })

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

export async function deleteRegistration(registrationId: string) {
  const session = await requirePermission("process", "delete")
  const user = session.user as any
  const labId = user.labId

  const registration = await db.registration.findFirst({
    where: { id: registrationId, labId },
    include: { samples: { where: { deletedAt: null }, select: { id: true } } },
  })
  if (!registration) throw new Error("Registration not found")

  // Soft delete all samples in this registration
  await db.sample.updateMany({
    where: { registrationId, labId, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: user.id },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "process",
    "delete",
    `Deleted registration ${registration.registrationNumber} (${registration.samples.length} samples)`
  )

  revalidatePath("/process/registration")
  revalidatePath("/process/test-results")
  revalidatePath("/process/sample-collection")

  return { success: true }
}

export async function getMyCollections() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const samples = await db.sample.findMany({
    where: { labId, collectedById: user.id, deletedAt: null },
    include: {
      client: true,
      sampleType: true,
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return samples
}
