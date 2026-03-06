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

  // Allow editing for pending/registered/assigned/edit samples
  // "edit" status = authenticator approved an edit request
  if (!["pending", "registered", "assigned", "edit"].includes(sample.status)) {
    notFound()
  }

  return (
    <EditSampleClient
      sample={JSON.parse(JSON.stringify(sample))}
      sampleTypes={sampleTypes}
      samplers={samplers}
    />
  )
}
