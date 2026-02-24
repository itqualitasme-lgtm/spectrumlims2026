import { getSampleTypesForSelect, getSamplersForSelect } from "@/actions/registrations"
import { NewRegistrationClient } from "./client"

export default async function NewRegistrationPage() {
  const [sampleTypes, samplers] = await Promise.all([
    getSampleTypesForSelect(),
    getSamplersForSelect(),
  ])

  return (
    <NewRegistrationClient
      sampleTypes={sampleTypes}
      samplers={samplers}
    />
  )
}
