import { getUsers } from "@/actions/users"
import { MenuAccessClient } from "./client"

export default async function MenuAccessPage() {
  const { users } = await getUsers()

  const userList = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    roleName: (u as any).role?.name || "",
  }))

  return <MenuAccessClient users={userList} />
}
