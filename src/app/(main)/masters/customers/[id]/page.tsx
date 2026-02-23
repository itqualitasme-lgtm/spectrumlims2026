import { getCustomer } from "@/actions/customers"
import { CustomerDetailClient } from "./client"
import { notFound } from "next/navigation"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)
  if (!customer) notFound()
  return <CustomerDetailClient customer={JSON.parse(JSON.stringify(customer))} />
}
