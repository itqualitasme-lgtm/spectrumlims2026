"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function getAuditLogs() {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const logs = await db.auditLog.findMany({
    where: { labId: user.labId },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const totalCount = await db.auditLog.count({
    where: { labId: user.labId },
  })

  // Calculate counts per module
  const moduleCounts: Record<string, number> = {}
  const actionCounts: Record<string, number> = {}

  for (const log of logs) {
    moduleCounts[log.module] = (moduleCounts[log.module] || 0) + 1
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
  }

  return {
    logs: JSON.parse(JSON.stringify(logs)),
    totalCount,
    moduleCounts,
    actionCounts,
  }
}
