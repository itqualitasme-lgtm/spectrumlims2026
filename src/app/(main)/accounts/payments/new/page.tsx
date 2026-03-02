import { getUnpaidInvoices } from "@/actions/payments"
import { NewPaymentClient } from "./client"

export default async function NewPaymentPage() {
  const invoices = await getUnpaidInvoices()
  return <NewPaymentClient invoices={JSON.parse(JSON.stringify(invoices))} />
}
