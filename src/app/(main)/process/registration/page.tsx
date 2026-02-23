import { getSamples } from "@/actions/registrations"
import { RegistrationClient } from "./client"

export default async function RegistrationPage() {
  const samples = await getSamples()
  return <RegistrationClient samples={JSON.parse(JSON.stringify(samples))} />
}
