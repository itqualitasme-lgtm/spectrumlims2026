import { getAuditLogs } from "@/actions/audit-logs"
import { AuditLogsClient } from "./client"

export default async function AuditLogsPage() {
  const data = await getAuditLogs()

  return (
    <AuditLogsClient
      logs={data.logs}
      totalCount={data.totalCount}
      moduleCounts={data.moduleCounts}
      actionCounts={data.actionCounts}
    />
  )
}
