"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function getStatusTrackingData(filters?: {
  from?: string
  to?: string
  clientId?: string
  status?: string
}) {
  const session = await requirePermission("masters", "view")
  const user = session.user as any
  const labId = user.labId

  const now = new Date()
  const rangeStart = filters?.from
    ? new Date(filters.from)
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const rangeEnd = filters?.to
    ? new Date(filters.to + "T23:59:59.999Z")
    : now

  const dateFilter = { gte: rangeStart, lte: rangeEnd }
  const sampleWhere: any = { labId, deletedAt: null }

  if (filters?.clientId) {
    sampleWhere.clientId = filters.clientId
  }

  // Status counts - all within date range
  const [
    samplesRegistered,
    samplesAssigned,
    samplesTesting,
    samplesCompleted,
    samplesReported,
  ] = await Promise.all([
    db.sample.count({ where: { ...sampleWhere, status: "registered", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "assigned", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "testing", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "completed", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "reported", createdAt: dateFilter } }),
  ])

  // Build sample list filter
  const listWhere: any = { ...sampleWhere, createdAt: dateFilter }
  if (filters?.status && filters.status !== "all") {
    listWhere.status = filters.status
  }

  // Fetch samples with full tracking data
  const samples = await db.sample.findMany({
    where: listWhere,
    include: {
      client: { select: { name: true, company: true } },
      sampleType: { select: { name: true } },
      assignedTo: { select: { name: true } },
      collectedBy: { select: { name: true } },
      registeredBy: { select: { name: true } },
      _count: { select: { testResults: true } },
      reports: {
        select: {
          status: true,
          reviewedAt: true,
          createdAt: true,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      testResults: {
        select: {
          status: true,
          dueDate: true,
          enteredAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Fetch customers for filter dropdown
  const customers = await db.customer.findMany({
    where: { labId, status: "active" },
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  })

  return {
    sampleStatus: {
      registered: samplesRegistered,
      assigned: samplesAssigned,
      testing: samplesTesting,
      completed: samplesCompleted,
      reported: samplesReported,
    },
    samples: samples.map((s) => {
      // Calculate due date from test results (earliest due)
      const dueDates = s.testResults
        .filter((tr) => tr.dueDate)
        .map((tr) => tr.dueDate!)
      const earliestDue = dueDates.length > 0
        ? new Date(Math.min(...dueDates.map((d) => d.getTime())))
        : null

      // Completion date = when all tests were completed (latest enteredAt)
      const allTestsDone = s.testResults.length > 0 && s.testResults.every((tr) => tr.status === "completed")
      const completedDates = s.testResults
        .filter((tr) => tr.enteredAt)
        .map((tr) => tr.enteredAt!)
      const completionDate = allTestsDone && completedDates.length > 0
        ? new Date(Math.max(...completedDates.map((d) => d.getTime())))
        : null

      // Report info
      const report = s.reports[0] || null
      const reportApprovedAt = report?.reviewedAt || null

      return {
        id: s.id,
        sampleNumber: s.sampleNumber,
        client: s.client.company || s.client.name,
        sampleType: s.sampleType.name,
        reference: s.reference || null,
        quantity: s.quantity || "1",
        status: s.status,
        collectionLocation: s.collectionLocation || null,
        collectedBy: s.collectedBy?.name || null,
        assignedTo: s.assignedTo?.name || null,
        registeredBy: s.registeredBy?.name || null,
        testCount: s._count.testResults,
        registeredAt: s.registeredAt?.toISOString() || s.createdAt.toISOString(),
        dueDate: earliestDue?.toISOString() || null,
        completionDate: completionDate?.toISOString() || null,
        reportStatus: report?.status || null,
        reportApprovedAt: reportApprovedAt?.toISOString() || null,
      }
    }),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.company || c.name,
    })),
  }
}
