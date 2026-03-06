import { getPortalSamples } from "@/actions/portal"
import { PortalSamplesClient } from "./client"

export default async function PortalSamplesPage() {
  const samples = await getPortalSamples()
  return <PortalSamplesClient samples={samples} />
}
