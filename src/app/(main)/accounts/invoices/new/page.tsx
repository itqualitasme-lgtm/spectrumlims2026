import { getCustomersForInvoice } from "@/actions/invoices"
import { NewInvoiceClient } from "./client"

export default async function NewInvoicePage() {
  const customers = await getCustomersForInvoice()
  return <NewInvoiceClient customers={JSON.parse(JSON.stringify(customers))} />
}
