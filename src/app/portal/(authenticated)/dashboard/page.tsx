import { getPortalDashboard } from "@/actions/portal"
import { PortalDashboardClient } from "./client"

export default async function PortalDashboardPage() {
  const data = await getPortalDashboard()
  return <PortalDashboardClient data={data} />
}
