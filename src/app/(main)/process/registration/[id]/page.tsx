import { getSample } from "@/actions/registrations"
import { SampleDetailClient } from "./client"
import { notFound } from "next/navigation"

export default async function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let sample
  try {
    sample = await getSample(id)
  } catch (error) {
    console.error("SampleDetailPage load error:", error)
    throw error
  }

  if (!sample) notFound()
  return <SampleDetailClient sample={JSON.parse(JSON.stringify(sample))} />
}
