import { getSample, getSampleTypesForSelect, getSamplersForSelect } from "@/actions/registrations"
import { EditSampleClient } from "./client"
import { notFound } from "next/navigation"

export default async function EditSamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [sample, sampleTypes, samplers] = await Promise.all([
    getSample(id),
    getSampleTypesForSelect(),
    getSamplersForSelect(),
  ])

  if (!sample) notFound()

  return (
    <EditSampleClient
      sample={JSON.parse(JSON.stringify(sample))}
      sampleTypes={sampleTypes}
      samplers={samplers}
    />
  )
}
