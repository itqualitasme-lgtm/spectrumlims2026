import { getPortalInvoices } from "@/actions/portal"
import { PortalInvoicesClient } from "./client"

export default async function PortalInvoicesPage() {
  const invoices = await getPortalInvoices()
  return <PortalInvoicesClient invoices={invoices} />
}
