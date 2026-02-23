import { getSampleTypes } from "@/actions/sample-types"
import { SampleTypesClient } from "./client"

export default async function SampleTypesPage() {
  const sampleTypes = await getSampleTypes()
  return <SampleTypesClient sampleTypes={JSON.parse(JSON.stringify(sampleTypes))} />
}
