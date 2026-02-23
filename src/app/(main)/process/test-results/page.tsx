import { getSamplesForTestEntry } from "@/actions/test-results"
import { TestResultsClient } from "./client"

export default async function TestResultsPage() {
  const samples = await getSamplesForTestEntry()
  return <TestResultsClient samples={JSON.parse(JSON.stringify(samples))} />
}
