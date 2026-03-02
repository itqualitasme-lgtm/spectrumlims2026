import { getCustomersForInvoice } from "@/actions/invoices"
import { NewInvoiceClient } from "./client"

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const customers = await getCustomersForInvoice()
  const { type } = await searchParams
  const invoiceType = type === "proforma" ? "proforma" : "tax"

  return (
    <NewInvoiceClient
      customers={JSON.parse(JSON.stringify(customers))}
      invoiceType={invoiceType}
    />
  )
}
