import { getInvoice, getCustomersForInvoice } from "@/actions/invoices"
import { EditInvoiceClient } from "./client"
import { notFound } from "next/navigation"

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [invoice, customers] = await Promise.all([
    getInvoice(id),
    getCustomersForInvoice(),
  ])
  if (!invoice) notFound()
  return (
    <EditInvoiceClient
      invoice={JSON.parse(JSON.stringify(invoice))}
      customers={JSON.parse(JSON.stringify(customers))}
    />
  )
}
