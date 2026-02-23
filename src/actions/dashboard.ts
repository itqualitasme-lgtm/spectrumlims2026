"use server"

import { db } from "@/lib/db"
import { getSession } from "@/lib/permissions"

export async function getDashboardData() {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId
  const roleName = user.roleName

  // Common stats (for all roles)
  const totalSamples = await db.sample.count({ where: { labId } })
  const pendingSamples = await db.sample.count({ where: { labId, status: { in: ["pending", "registered"] } } })
  const inProgressSamples = await db.sample.count({ where: { labId, status: { in: ["assigned", "testing"] } } })
  const completedSamples = await db.sample.count({ where: { labId, status: { in: ["completed", "reported"] } } })
  const totalReports = await db.report.count({ where: { labId } })
  const totalInvoices = await db.invoice.count({ where: { labId } })

  // Admin-specific
  const totalEmployees = await db.user.count({ where: { labId } })
  const totalClients = await db.customer.count({ where: { labId } })

  // Financial
  const invoices = await db.invoice.findMany({ where: { labId } })
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.total, 0)
  const outstandingAmount = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((sum, i) => sum + i.total, 0)

  // Chemist-specific
  let myAssigned = 0
  let myPendingResults = 0
  if (roleName === "Chemist") {
    myAssigned = await db.sample.count({ where: { labId, assignedToId: user.id, status: { in: ["assigned", "testing"] } } })
    myPendingResults = await db.testResult.count({
      where: { status: "pending", sample: { assignedToId: user.id, labId } }
    })
  }

  // Sampler-specific
  let todayCollections = 0
  if (roleName === "Sampler") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    todayCollections = await db.sample.count({
      where: { labId, collectedById: user.id, collectionDate: { gte: today } }
    })
  }

  // Recent samples (last 5)
  const recentSamples = await db.sample.findMany({
    where: { labId },
    include: { client: true, sampleType: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // Recent reports (last 5)
  const recentReports = await db.report.findMany({
    where: { labId },
    include: { sample: { include: { client: true, sampleType: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return {
    roleName,
    totalSamples, pendingSamples, inProgressSamples, completedSamples,
    totalReports, totalInvoices, totalEmployees, totalClients,
    totalRevenue, outstandingAmount,
    myAssigned, myPendingResults, todayCollections,
    recentSamples: JSON.parse(JSON.stringify(recentSamples)),
    recentReports: JSON.parse(JSON.stringify(recentReports)),
  }
}
