import { getInvoices } from "@/actions/invoices"
import { InvoicesClient } from "./client"

export default async function InvoicesPage() {
  const invoices = await getInvoices()
  return <InvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />
}
