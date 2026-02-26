import { getRegistrationGroups } from "@/actions/test-results"
import { TestResultsClient } from "./client"

export default async function TestResultsPage() {
  const groups = await getRegistrationGroups()
  return <TestResultsClient groups={JSON.parse(JSON.stringify(groups))} />
}
