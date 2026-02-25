import { getDeletedInvoices } from "@/actions/trash"
import { DeletedInvoicesClient } from "./client"

export default async function DeletedInvoicesPage() {
  const invoices = await getDeletedInvoices()
  return <DeletedInvoicesClient invoices={JSON.parse(JSON.stringify(invoices))} />
}
