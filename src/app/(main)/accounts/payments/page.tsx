import { getPayments } from "@/actions/payments"
import { PaymentsClient } from "./client"

export default async function PaymentsPage() {
  const payments = await getPayments()
  return <PaymentsClient payments={JSON.parse(JSON.stringify(payments))} />
}
