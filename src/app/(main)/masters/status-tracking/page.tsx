import { getStatusTrackingData } from "@/actions/status-tracking"
import { StatusTrackingClient } from "./client"

export default async function StatusTrackingPage() {
  const data = await getStatusTrackingData()
  return <StatusTrackingClient initialData={JSON.parse(JSON.stringify(data))} />
}
