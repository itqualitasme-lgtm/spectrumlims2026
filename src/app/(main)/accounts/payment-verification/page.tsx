import { getPendingPayments } from "@/actions/payments"
import { PaymentVerificationClient } from "./client"

export default async function PaymentVerificationPage() {
  const payments = await getPendingPayments()
  return <PaymentVerificationClient payments={JSON.parse(JSON.stringify(payments))} />
}
