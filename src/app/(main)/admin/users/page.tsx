import { getUsers, getRoles, getCustomers } from "@/actions/users"
import { UsersClient } from "./client"

export default async function UsersPage() {
  const [{ users, portalUsers }, roles, customers] = await Promise.all([
    getUsers(),
    getRoles(),
    getCustomers(),
  ])

  return (
    <UsersClient
      users={JSON.parse(JSON.stringify(users))}
      portalUsers={JSON.parse(JSON.stringify(portalUsers))}
      roles={JSON.parse(JSON.stringify(roles))}
      customers={JSON.parse(JSON.stringify(customers))}
    />
  )
}
