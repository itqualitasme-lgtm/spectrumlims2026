import { getSample, getSampleTypesForSelect, getSamplersForSelect } from "@/actions/registrations"
import { EditSampleClient } from "./client"
import { notFound } from "next/navigation"

export default async function EditSamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let sample, sampleTypes, samplers
  try {
    ;[sample, sampleTypes, samplers] = await Promise.all([
      getSample(id),
      getSampleTypesForSelect(),
      getSamplersForSelect(),
    ])
  } catch (error) {
    console.error("EditSamplePage load error:", error)
    throw error
  }

  if (!sample) notFound()

  return (
    <EditSampleClient
      sample={JSON.parse(JSON.stringify(sample))}
      sampleTypes={sampleTypes}
      samplers={samplers}
    />
  )
}
