"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function searchCustomersForTracking(query: string) {
  const session = await requirePermission("process", "view")
  const user = session.user as any

  if (!query || query.length < 2) return []

  const customers = await db.customer.findMany({
    where: {
      labId: user.labId,
      status: "active",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
    take: 20,
  })

  return customers.map((c) => ({
    id: c.id,
    name: c.company || c.name,
  }))
}

export async function getStatusTrackingData(filters: {
  from?: string
  to?: string
  clientId?: string
  sampleNumber?: string
  status?: string
}) {
  const session = await requirePermission("process", "view")
  const user = session.user as any
  const labId = user.labId

  // Build registration-level filters
  const regWhere: any = { labId }

  if (filters.clientId) {
    regWhere.clientId = filters.clientId
  }

  if (filters.sampleNumber) {
    // Search by registration number or sample number
    regWhere.OR = [
      { registrationNumber: { contains: filters.sampleNumber, mode: "insensitive" } },
      { samples: { some: { sampleNumber: { contains: filters.sampleNumber, mode: "insensitive" }, deletedAt: null } } },
    ]
  }

  if (filters.from || filters.to) {
    regWhere.createdAt = {}
    if (filters.from) regWhere.createdAt.gte = new Date(filters.from)
    if (filters.to) regWhere.createdAt.lte = new Date(filters.to + "T23:59:59.999Z")
  }

  const registrations = await db.registration.findMany({
    where: regWhere,
    include: {
      client: { select: { name: true, company: true } },
      samples: {
        where: { deletedAt: null },
        include: {
          sampleType: { select: { name: true } },
          testResults: {
            select: { status: true, dueDate: true, enteredAt: true },
          },
          reports: {
            select: { status: true, reviewedAt: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { subSampleNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    registrations: registrations.map((reg) => {
      // Aggregate sample types
      const typeMap = new Map<string, number>()
      for (const s of reg.samples) {
        const name = s.sampleType.name
        typeMap.set(name, (typeMap.get(name) || 0) + 1)
      }
      const sampleTypes = Array.from(typeMap.entries()).map(([name, count]) =>
        typeMap.size > 1 ? `${name} (${count})` : name
      ).join(", ")

      // Aggregate test counts
      const totalTests = reg.samples.reduce((sum, s) => sum + s.testResults.length, 0)

      // Aggregate due dates
      const allDueDates = reg.samples.flatMap((s) =>
        s.testResults.filter((tr) => tr.dueDate).map((tr) => tr.dueDate!)
      )
      const earliestDue = allDueDates.length > 0
        ? new Date(Math.min(...allDueDates.map((d) => d.getTime())))
        : null

      // Completion: all tests done across all samples
      const allTestResults = reg.samples.flatMap((s) => s.testResults)
      const allTestsDone = allTestResults.length > 0 && allTestResults.every((tr) => tr.status === "completed")
      const completedDates = allTestResults
        .filter((tr) => tr.enteredAt)
        .map((tr) => tr.enteredAt!)
      const completionDate = allTestsDone && completedDates.length > 0
        ? new Date(Math.max(...completedDates.map((d) => d.getTime())))
        : null

      // Report approval: check if all samples have approved reports
      const reportApprovedDates = reg.samples
        .filter((s) => s.reports[0]?.reviewedAt)
        .map((s) => s.reports[0].reviewedAt!)
      const reportApprovedAt = reportApprovedDates.length === reg.samples.length && reportApprovedDates.length > 0
        ? new Date(Math.max(...reportApprovedDates.map((d) => d.getTime())))
        : null

      // Overall status
      const statuses = reg.samples.map((s) => s.status)
      const allSame = statuses.length > 0 && statuses.every((s) => s === statuses[0])
      const overallStatus = allSame ? statuses[0] : "mixed"

      return {
        id: reg.id,
        registrationNumber: reg.registrationNumber,
        client: reg.client.company || reg.client.name,
        sampleTypes,
        sampleCount: reg.samples.length,
        reference: reg.reference || null,
        status: overallStatus,
        testCount: totalTests,
        registeredAt: reg.registeredAt?.toISOString() || reg.createdAt.toISOString(),
        dueDate: earliestDue?.toISOString() || null,
        completionDate: completionDate?.toISOString() || null,
        reportApprovedAt: reportApprovedAt?.toISOString() || null,
      }
    }),
  }
}
