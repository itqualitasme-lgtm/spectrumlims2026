"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function getSampleTypes() {
  const session = await requirePermission("masters", "view")
  const user = session.user as any

  const sampleTypes = await db.sampleType.findMany({
    where: { labId: user.labId },
    orderBy: { name: "asc" },
  })

  return sampleTypes
}

export async function getSampleType(id: string) {
  const session = await requirePermission("masters", "view")
  const user = session.user as any

  const sampleType = await db.sampleType.findFirst({
    where: { id, labId: user.labId },
  })

  if (!sampleType) throw new Error("Sample type not found")
  return sampleType
}

export async function createSampleType(data: {
  name: string
  description?: string
  specificationStandard?: string
  defaultTests?: string
  status?: string
}) {
  const session = await requirePermission("masters", "create")
  const user = session.user as any

  const sampleType = await db.sampleType.create({
    data: {
      name: data.name,
      description: data.description || null,
      specificationStandard: data.specificationStandard || null,
      defaultTests: data.defaultTests || "[]",
      status: data.status || "active",
      labId: user.labId,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "sample-types",
    "create",
    `Created sample type: ${sampleType.name}`
  )

  revalidatePath("/masters/sample-types")
  return sampleType
}

export async function updateSampleType(
  id: string,
  data: {
    name?: string
    description?: string
    specificationStandard?: string
    defaultTests?: string
    status?: string
  }
) {
  const session = await requirePermission("masters", "edit")
  const user = session.user as any

  // Verify sample type belongs to this lab
  const existing = await db.sampleType.findFirst({ where: { id, labId: user.labId } })
  if (!existing) throw new Error("Sample type not found")

  const sampleType = await db.sampleType.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      specificationStandard: data.specificationStandard !== undefined ? (data.specificationStandard || null) : undefined,
      defaultTests: data.defaultTests,
      status: data.status,
    },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "sample-types",
    "update",
    `Updated sample type: ${sampleType.name}`
  )

  revalidatePath("/masters/sample-types")
  return sampleType
}

export async function deleteSampleType(id: string) {
  const session = await requirePermission("masters", "delete")
  const user = session.user as any

  // Verify sample type belongs to this lab
  const existing = await db.sampleType.findFirst({ where: { id, labId: user.labId } })
  if (!existing) throw new Error("Sample type not found")

  // Check for associated samples
  const sampleCount = await db.sample.count({
    where: { sampleTypeId: id, labId: user.labId },
  })

  if (sampleCount > 0) {
    throw new Error(
      `Cannot delete sample type. There are ${sampleCount} sample(s) associated with this sample type.`
    )
  }

  const sampleType = await db.sampleType.delete({
    where: { id },
  })

  await logAudit(
    user.labId,
    user.id,
    user.name,
    "sample-types",
    "delete",
    `Deleted sample type: ${sampleType.name}`
  )

  revalidatePath("/masters/sample-types")
  return sampleType
}
