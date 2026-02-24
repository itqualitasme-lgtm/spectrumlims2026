import { getSampleType } from "@/actions/sample-types"
import { EditSampleTypeClient } from "./client"
import { notFound } from "next/navigation"

export default async function EditSampleTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const sampleType = await getSampleType(id)
    return <EditSampleTypeClient sampleType={JSON.parse(JSON.stringify(sampleType))} />
  } catch {
    notFound()
  }
}
