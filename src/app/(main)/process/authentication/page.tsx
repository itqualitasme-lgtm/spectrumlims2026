import { getReportsForAuthentication } from "@/actions/reports"
import { AuthenticationClient } from "./client"

export default async function AuthenticationPage() {
  const reports = await getReportsForAuthentication()
  return <AuthenticationClient reports={JSON.parse(JSON.stringify(reports))} />
}
