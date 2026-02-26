import { getRegistrations } from "@/actions/registrations"
import { RegistrationClient } from "./client"

export default async function RegistrationPage() {
  const registrations = await getRegistrations()
  return <RegistrationClient registrations={JSON.parse(JSON.stringify(registrations))} />
}
