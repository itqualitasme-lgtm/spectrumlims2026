import { getReportTemplates } from "@/actions/report-templates"
import { ReportTemplatesClient } from "./client"

export default async function ReportTemplatesPage() {
  const templates = await getReportTemplates()
  return <ReportTemplatesClient templates={JSON.parse(JSON.stringify(templates))} />
}
