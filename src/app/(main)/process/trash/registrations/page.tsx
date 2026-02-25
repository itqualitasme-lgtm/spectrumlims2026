import { getDeletedRegistrations } from "@/actions/trash"
import { DeletedRegistrationsClient } from "./client"

export default async function DeletedRegistrationsPage() {
  const samples = await getDeletedRegistrations()
  return <DeletedRegistrationsClient samples={JSON.parse(JSON.stringify(samples))} />
}
