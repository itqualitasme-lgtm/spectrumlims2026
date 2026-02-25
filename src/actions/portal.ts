"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

async function getPortalSession() {
  const session = await auth()
  if (!session?.user) throw new Error("Not authenticated")
  const user = session.user as any
  if (!user.customerId) throw new Error("Not a portal user")
  return { user, customerId: user.customerId as string, labId: user.labId as string }
}

export async function getPortalDashboard() {
  const { customerId, labId } = await getPortalSession()

  const totalSamples = await db.sample.count({
    where: { clientId: customerId, labId, deletedAt: null },
  })

  const pendingSamples = await db.sample.count({
    where: { clientId: customerId, labId, deletedAt: null, status: { in: ["pending", "registered", "assigned", "testing"] } },
  })

  const completedSamples = await db.sample.count({
    where: { clientId: customerId, labId, deletedAt: null, status: { in: ["completed", "reported"] } },
  })

  const totalReports = await db.report.count({
    where: { labId, sample: { clientId: customerId } },
  })

  const publishedReports = await db.report.count({
    where: { labId, status: "published", sample: { clientId: customerId } },
  })

  const totalInvoices = await db.invoice.count({
    where: { clientId: customerId, labId, deletedAt: null },
  })

  const invoices = await db.invoice.findMany({
    where: { clientId: customerId, labId, deletedAt: null },
  })

  const paidInvoices = invoices.filter((i) => i.status === "paid").length

  const outstandingAmount = invoices
    .filter((i) => ["sent", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0)

  const recentSamples = await db.sample.findMany({
    where: { clientId: customerId, labId, deletedAt: null },
    include: { sampleType: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const recentReports = await db.report.findMany({
    where: { labId, status: "published", sample: { clientId: customerId } },
    include: { sample: { include: { sampleType: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return {
    totalSamples,
    pendingSamples,
    completedSamples,
    totalReports,
    publishedReports,
    totalInvoices,
    paidInvoices,
    outstandingAmount,
    recentSamples: JSON.parse(JSON.stringify(recentSamples)),
    recentReports: JSON.parse(JSON.stringify(recentReports)),
  }
}

export async function getPortalSamples() {
  const { customerId, labId } = await getPortalSession()

  const samples = await db.sample.findMany({
    where: { clientId: customerId, labId, deletedAt: null },
    include: {
      sampleType: true,
      testResults: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return JSON.parse(JSON.stringify(samples))
}

export async function getPortalSample(id: string) {
  const { customerId, labId } = await getPortalSession()

  const sample = await db.sample.findFirst({
    where: { id, clientId: customerId, labId },
    include: {
      sampleType: true,
      testResults: true,
      reports: true,
    },
  })

  if (!sample) throw new Error("Sample not found")

  return JSON.parse(JSON.stringify(sample))
}

export async function getPortalReports() {
  const { customerId, labId } = await getPortalSession()

  const reports = await db.report.findMany({
    where: {
      labId,
      status: "published",
      sample: { clientId: customerId },
    },
    include: {
      sample: {
        include: { sampleType: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return JSON.parse(JSON.stringify(reports))
}

export async function getPortalQuotations() {
  const { customerId, labId } = await getPortalSession()

  const quotations = await db.quotation.findMany({
    where: { clientId: customerId, labId },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return JSON.parse(JSON.stringify(quotations))
}

export async function getPortalInvoices() {
  const { customerId, labId } = await getPortalSession()

  const invoices = await db.invoice.findMany({
    where: { clientId: customerId, labId, deletedAt: null },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return JSON.parse(JSON.stringify(invoices))
}
