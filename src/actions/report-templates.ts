"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getReportTemplates() {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  return db.reportTemplate.findMany({
    where: { labId: user.labId },
    orderBy: { createdAt: "asc" },
  })
}

export async function getReportTemplate(id: string) {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const template = await db.reportTemplate.findFirst({
    where: { id, labId: user.labId },
  })

  if (!template) throw new Error("Template not found")
  return template
}

export async function getReportTemplatesForSelect() {
  const session = await requirePermission("process", "view")
  const user = session.user as any

  const templates = await db.reportTemplate.findMany({
    where: { labId: user.labId },
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })

  return templates
}

export async function createReportTemplate(data: {
  name: string
  headerText?: string
  footerText?: string
  logoUrl?: string
  accreditationLogoUrl?: string
  accreditationText?: string
  sealUrl?: string
  showLabLogo?: boolean
  isDefault?: boolean
}) {
  const session = await requirePermission("admin", "create")
  const user = session.user as any
  const labId = user.labId

  if (!data.name.trim()) throw new Error("Template name is required")

  // If setting as default, unset any existing default
  if (data.isDefault) {
    await db.reportTemplate.updateMany({
      where: { labId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await db.reportTemplate.create({
    data: {
      name: data.name.trim(),
      headerText: data.headerText?.trim() || null,
      footerText: data.footerText?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      accreditationLogoUrl: data.accreditationLogoUrl?.trim() || null,
      accreditationText: data.accreditationText?.trim() || null,
      sealUrl: data.sealUrl?.trim() || null,
      showLabLogo: data.showLabLogo ?? true,
      isDefault: data.isDefault ?? false,
      labId,
    },
  })

  await logAudit(labId, user.id, user.name, "admin", "create", `Created report template: ${template.name}`)
  revalidatePath("/admin/report-templates")
  return template
}

export async function updateReportTemplate(
  id: string,
  data: {
    name?: string
    headerText?: string
    footerText?: string
    logoUrl?: string
    accreditationLogoUrl?: string
    accreditationText?: string
    sealUrl?: string
    showLabLogo?: boolean
    isDefault?: boolean
  }
) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.reportTemplate.findFirst({ where: { id, labId } })
  if (!existing) throw new Error("Template not found")

  // If setting as default, unset any existing default
  if (data.isDefault) {
    await db.reportTemplate.updateMany({
      where: { labId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const template = await db.reportTemplate.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      headerText: data.headerText?.trim() || null,
      footerText: data.footerText?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      accreditationLogoUrl: data.accreditationLogoUrl?.trim() || null,
      accreditationText: data.accreditationText?.trim() || null,
      sealUrl: data.sealUrl?.trim() || null,
      showLabLogo: data.showLabLogo,
      isDefault: data.isDefault,
    },
  })

  await logAudit(labId, user.id, user.name, "admin", "edit", `Updated report template: ${template.name}`)
  revalidatePath("/admin/report-templates")
  return template
}

export async function deleteReportTemplate(id: string) {
  const session = await requirePermission("admin", "delete")
  const user = session.user as any
  const labId = user.labId

  const existing = await db.reportTemplate.findFirst({ where: { id, labId } })
  if (!existing) throw new Error("Template not found")

  // Check if template is used by any reports
  const reportCount = await db.report.count({ where: { templateId: id } })
  if (reportCount > 0) {
    throw new Error(`Cannot delete template. ${reportCount} report(s) use this template.`)
  }

  await db.reportTemplate.delete({ where: { id } })

  await logAudit(labId, user.id, user.name, "admin", "delete", `Deleted report template: ${existing.name}`)
  revalidatePath("/admin/report-templates")
}
