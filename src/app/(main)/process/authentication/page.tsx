import { getReportsForAuthentication } from "@/actions/reports"
import { getReportTemplatesForSelect } from "@/actions/report-templates"
import { getPendingEditRequests } from "@/actions/edit-requests"
import { AuthenticationClient } from "./client"

export default async function AuthenticationPage() {
  const [reports, templates, editRequests] = await Promise.all([
    getReportsForAuthentication(),
    getReportTemplatesForSelect(),
    getPendingEditRequests(),
  ])
  return (
    <AuthenticationClient
      reports={JSON.parse(JSON.stringify(reports))}
      templates={JSON.parse(JSON.stringify(templates))}
      editRequests={JSON.parse(JSON.stringify(editRequests))}
    />
  )
}
