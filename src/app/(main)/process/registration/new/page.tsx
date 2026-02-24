import { getCustomersForSelect, getSampleTypesForSelect, getSamplersForSelect } from "@/actions/registrations"
import { NewRegistrationClient } from "./client"

export default async function NewRegistrationPage() {
  const [customers, sampleTypes, samplers] = await Promise.all([
    getCustomersForSelect(),
    getSampleTypesForSelect(),
    getSamplersForSelect(),
  ])

  return (
    <NewRegistrationClient
      customers={customers}
      sampleTypes={sampleTypes}
      samplers={samplers}
    />
  )
}
