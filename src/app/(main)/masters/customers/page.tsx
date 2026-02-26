import { getCustomers } from "@/actions/customers"
import { db } from "@/lib/db"
import { getSession } from "@/lib/permissions"
import { CustomersClient } from "./client"

export default async function CustomersPage() {
  const session = await getSession()
  const user = session.user as any

  const [customers, lab] = await Promise.all([
    getCustomers(),
    db.lab.findFirst({
      where: { id: user.labId },
      select: { zohoClientId: true, zohoRefreshToken: true, zohoOrgId: true, zohoClientSecret: true },
    }),
  ])

  const zohoConfigured = !!(lab?.zohoClientId && lab?.zohoClientSecret && lab?.zohoRefreshToken && lab?.zohoOrgId)

  return (
    <CustomersClient
      customers={JSON.parse(JSON.stringify(customers))}
      zohoConfigured={zohoConfigured}
    />
  )
}
