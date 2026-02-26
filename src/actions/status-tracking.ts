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

  const sampleWhere: any = { labId, deletedAt: null }

  if (filters.clientId) {
    sampleWhere.clientId = filters.clientId
  }

  if (filters.sampleNumber) {
    sampleWhere.sampleNumber = { contains: filters.sampleNumber, mode: "insensitive" }
  }

  if (filters.from || filters.to) {
    sampleWhere.createdAt = {}
    if (filters.from) sampleWhere.createdAt.gte = new Date(filters.from)
    if (filters.to) sampleWhere.createdAt.lte = new Date(filters.to + "T23:59:59.999Z")
  }

  if (filters.status && filters.status !== "all") {
    sampleWhere.status = filters.status
  }

  const samples = await db.sample.findMany({
    where: sampleWhere,
    include: {
      client: { select: { name: true, company: true } },
      sampleType: { select: { name: true } },
      _count: { select: { testResults: true } },
      reports: {
        select: { status: true, reviewedAt: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      testResults: {
        select: { status: true, dueDate: true, enteredAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    samples: samples.map((s) => {
      const dueDates = s.testResults
        .filter((tr) => tr.dueDate)
        .map((tr) => tr.dueDate!)
      const earliestDue = dueDates.length > 0
        ? new Date(Math.min(...dueDates.map((d) => d.getTime())))
        : null

      const allTestsDone = s.testResults.length > 0 && s.testResults.every((tr) => tr.status === "completed")
      const completedDates = s.testResults
        .filter((tr) => tr.enteredAt)
        .map((tr) => tr.enteredAt!)
      const completionDate = allTestsDone && completedDates.length > 0
        ? new Date(Math.max(...completedDates.map((d) => d.getTime())))
        : null

      const report = s.reports[0] || null

      return {
        id: s.id,
        sampleNumber: s.sampleNumber,
        client: s.client.company || s.client.name,
        sampleType: s.sampleType.name,
        reference: s.reference || null,
        status: s.status,
        testCount: s._count.testResults,
        registeredAt: s.registeredAt?.toISOString() || s.createdAt.toISOString(),
        dueDate: earliestDue?.toISOString() || null,
        completionDate: completionDate?.toISOString() || null,
        reportApprovedAt: report?.reviewedAt?.toISOString() || null,
      }
    }),
  }
}
