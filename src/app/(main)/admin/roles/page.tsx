import { getRoles } from "@/actions/roles"
import { RolesClient } from "./client"

export default async function RolesPage() {
  const { roles, permissions } = await getRoles()

  return <RolesClient roles={roles} permissions={permissions} />
}
