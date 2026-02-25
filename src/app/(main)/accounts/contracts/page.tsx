import { getContracts } from "@/actions/contracts"
import { ContractsClient } from "./client"

export default async function ContractsPage() {
  const contracts = await getContracts()
  return <ContractsClient contracts={JSON.parse(JSON.stringify(contracts))} />
}
