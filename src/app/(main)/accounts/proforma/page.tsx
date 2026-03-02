import { getInvoices } from "@/actions/invoices"
import { ProformaClient } from "./client"

export default async function ProformaPage() {
  const invoices = await getInvoices("proforma")
  return <ProformaClient invoices={JSON.parse(JSON.stringify(invoices))} />
}
