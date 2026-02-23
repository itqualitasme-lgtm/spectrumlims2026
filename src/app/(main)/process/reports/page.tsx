import { getReports } from "@/actions/reports"
import { ReportsClient } from "./client"

export default async function ReportsPage() {
  const reports = await getReports()
  return <ReportsClient reports={JSON.parse(JSON.stringify(reports))} />
}
