import { getPortalQuotations } from "@/actions/portal"
import { PortalQuotationsClient } from "./client"

export default async function PortalQuotationsPage() {
  const quotations = await getPortalQuotations()
  return <PortalQuotationsClient quotations={quotations} />
}
