import { db } from "@/lib/db"
import { getSession } from "@/lib/permissions"
import { SettingsClient } from "./client"

export default async function SettingsPage() {
  const session = await getSession()
  const user = session.user as any

  const lab = await db.lab.findFirst({
    where: { id: user.labId },
  })

  return <SettingsClient lab={JSON.parse(JSON.stringify(lab))} />
}
