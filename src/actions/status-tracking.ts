"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function getStatusTrackingData(filters?: {
  from?: string
  to?: string
  clientId?: string
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
  const clientFilter = filters?.clientId ? { clientId: filters.clientId } : {}
  const sampleWhere = { labId, deletedAt: null, ...clientFilter }
  const invoiceWhere = {
    labId,
    deletedAt: null,
    ...(filters?.clientId ? { clientId: filters.clientId } : {}),
  }

  const [
    // Sample status counts (within date range)
    samplesRegistered,
    samplesAssigned,
    samplesTesting,
    samplesCompleted,
    samplesReported,

    // Report status counts (all time for pending items)
    reportsDraft,
    reportsReview,
    reportsRevision,
    reportsApproved,
    reportsPublished,

    // Invoice status counts
    invoicesDraft,
    invoicesSent,
    invoicesOverdue,
    invoicesPaid,

    // Pending samples list (not completed)
    pendingSamples,

    // Overdue test results
    overdueTestResults,

    // Outstanding invoice amount
    outstandingInvoices,
  ] = await Promise.all([
    // Sample statuses
    db.sample.count({ where: { ...sampleWhere, status: "registered", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "assigned", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "testing", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "completed", createdAt: dateFilter } }),
    db.sample.count({ where: { ...sampleWhere, status: "reported", createdAt: dateFilter } }),

    // Report statuses (all pending regardless of date)
    db.report.count({ where: { labId, status: "draft" } }),
    db.report.count({ where: { labId, status: "review" } }),
    db.report.count({ where: { labId, status: "revision" } }),
    db.report.count({ where: { labId, status: "approved" } }),
    db.report.count({ where: { labId, status: "published" } }),

    // Invoice statuses
    db.invoice.count({ where: { ...invoiceWhere, status: "draft" } }),
    db.invoice.count({ where: { ...invoiceWhere, status: "sent" } }),
    db.invoice.count({ where: { ...invoiceWhere, status: "overdue" } }),
    db.invoice.count({ where: { ...invoiceWhere, status: "paid" } }),

    // Pending samples (active, not completed/reported)
    db.sample.findMany({
      where: {
        ...sampleWhere,
        status: { in: ["registered", "assigned", "testing"] },
      },
      include: {
        client: { select: { name: true, company: true } },
        sampleType: { select: { name: true } },
        assignedTo: { select: { name: true } },
        _count: { select: { testResults: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Overdue test results (past due date, still pending)
    db.testResult.findMany({
      where: {
        sample: { labId, deletedAt: null },
        status: "pending",
        dueDate: { lt: now },
      },
      include: {
        sample: {
          select: {
            sampleNumber: true,
            client: { select: { name: true, company: true } },
            sampleType: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),

    // Outstanding invoices
    db.invoice.findMany({
      where: { ...invoiceWhere, status: { in: ["sent", "overdue"] } },
      select: { total: true },
    }),
  ])

  const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + Number(i.total), 0)

  return {
    sampleStatus: {
      registered: samplesRegistered,
      assigned: samplesAssigned,
      testing: samplesTesting,
      completed: samplesCompleted,
      reported: samplesReported,
    },
    reportStatus: {
      draft: reportsDraft,
      review: reportsReview,
      revision: reportsRevision,
      approved: reportsApproved,
      published: reportsPublished,
    },
    pipeline: {
      testingPending: samplesRegistered + samplesAssigned + samplesTesting,
      authenticationPending: reportsDraft + reportsReview,
      revisionPending: reportsRevision,
      invoicePending: invoicesDraft,
      receiptPending: invoicesSent + invoicesOverdue,
      overdueTests: overdueTestResults.length,
      outstandingAmount,
    },
    accountsStatus: {
      draft: invoicesDraft,
      sent: invoicesSent,
      overdue: invoicesOverdue,
      paid: invoicesPaid,
    },
    pendingSamples: pendingSamples.map((s) => ({
      id: s.id,
      sampleNumber: s.sampleNumber,
      client: s.client.company || s.client.name,
      sampleType: s.sampleType.name,
      assignedTo: s.assignedTo?.name || "Unassigned",
      status: s.status,
      testCount: s._count.testResults,
      createdAt: s.createdAt.toISOString(),
      registeredAt: s.registeredAt?.toISOString() || s.createdAt.toISOString(),
    })),
    overdueTests: overdueTestResults.map((tr) => ({
      id: tr.id,
      parameter: tr.parameter,
      sampleNumber: tr.sample.sampleNumber,
      client: tr.sample.client.company || tr.sample.client.name,
      sampleType: tr.sample.sampleType.name,
      dueDate: tr.dueDate?.toISOString() || null,
    })),
  }
}
