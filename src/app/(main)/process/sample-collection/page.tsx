import {
  getMyCollections,
  getSampleTypesForSelect,
} from "@/actions/registrations"
import { SampleCollectionClient } from "./client"

export default async function SampleCollectionPage() {
  const [collections, sampleTypes] = await Promise.all([
    getMyCollections(),
    getSampleTypesForSelect(),
  ])

  return (
    <SampleCollectionClient
      collections={JSON.parse(JSON.stringify(collections))}
      sampleTypes={sampleTypes}
    />
  )
}
