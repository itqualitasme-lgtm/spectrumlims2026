"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function updateLabSettings(data: {
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  trn?: string
}) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any
  const labId = user.labId

  if (!data.name.trim()) {
    throw new Error("Lab name is required")
  }

  const lab = await db.lab.update({
    where: { id: labId },
    data: {
      name: data.name.trim(),
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      trn: data.trn?.trim() || null,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "settings",
    "update",
    `Updated lab settings: ${lab.name}`
  )

  revalidatePath("/admin/settings")

  return lab
}

export async function updateZohoSettings(data: {
  zohoClientId?: string
  zohoClientSecret?: string
  zohoRefreshToken?: string
  zohoOrgId?: string
  zohoApiDomain?: string
}) {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any
  const labId = user.labId

  const lab = await db.lab.update({
    where: { id: labId },
    data: {
      zohoClientId: data.zohoClientId?.trim() || null,
      zohoClientSecret: data.zohoClientSecret?.trim() || null,
      zohoRefreshToken: data.zohoRefreshToken?.trim() || null,
      zohoOrgId: data.zohoOrgId?.trim() || null,
      zohoApiDomain: data.zohoApiDomain || null,
    },
  })

  await logAudit(
    labId,
    user.id,
    user.name,
    "settings",
    "update",
    "Updated Zoho Books integration settings"
  )

  revalidatePath("/admin/settings")

  return lab
}
