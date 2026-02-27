import { getDeletedReports } from "@/actions/trash"
import { DeletedReportsClient } from "./client"

export default async function DeletedReportsPage() {
  const reports = await getDeletedReports()
  return <DeletedReportsClient reports={JSON.parse(JSON.stringify(reports))} />
}
