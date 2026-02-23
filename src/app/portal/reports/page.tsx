import { getPortalReports } from "@/actions/portal"
import { PortalReportsClient } from "./client"

export default async function PortalReportsPage() {
  const reports = await getPortalReports()
  return <PortalReportsClient reports={reports} />
}
