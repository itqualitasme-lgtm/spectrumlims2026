import { getSample } from "@/actions/registrations"
import { SampleDetailClient } from "./client"
import { notFound } from "next/navigation"

export default async function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sample = await getSample(id)
  if (!sample) notFound()
  return <SampleDetailClient sample={JSON.parse(JSON.stringify(sample))} />
}
