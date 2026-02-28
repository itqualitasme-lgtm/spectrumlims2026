import { getReportsForAuthentication } from "@/actions/reports"
import { getReportTemplatesForSelect } from "@/actions/report-templates"
import { AuthenticationClient } from "./client"

export default async function AuthenticationPage() {
  const [reports, templates] = await Promise.all([
    getReportsForAuthentication(),
    getReportTemplatesForSelect(),
  ])
  return (
    <AuthenticationClient
      reports={JSON.parse(JSON.stringify(reports))}
      templates={JSON.parse(JSON.stringify(templates))}
    />
  )
}
