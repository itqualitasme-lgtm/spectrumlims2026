import { getReportTemplate } from "@/actions/report-templates"
import { EditReportTemplateClient } from "./client"
import { notFound } from "next/navigation"

export default async function EditReportTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const template = await getReportTemplate(id)
    return <EditReportTemplateClient template={JSON.parse(JSON.stringify(template))} />
  } catch {
    notFound()
  }
}
