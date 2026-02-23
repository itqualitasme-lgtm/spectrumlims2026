import { getQuotations } from "@/actions/quotations"
import { QuotationsClient } from "./client"

export default async function QuotationsPage() {
  const quotations = await getQuotations()
  return <QuotationsClient quotations={JSON.parse(JSON.stringify(quotations))} />
}
