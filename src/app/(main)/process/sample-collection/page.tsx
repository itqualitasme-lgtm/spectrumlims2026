import {
  getMyCollections,
  getCustomersForSelect,
  getSampleTypesForSelect,
} from "@/actions/registrations"
import { SampleCollectionClient } from "./client"

export default async function SampleCollectionPage() {
  const [collections, customers, sampleTypes] = await Promise.all([
    getMyCollections(),
    getCustomersForSelect(),
    getSampleTypesForSelect(),
  ])

  return (
    <SampleCollectionClient
      collections={JSON.parse(JSON.stringify(collections))}
      customers={customers}
      sampleTypes={sampleTypes}
    />
  )
}
