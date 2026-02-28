"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

function escapeCsvField(value: string | null | undefined): string {
  if (value == null || value === "") return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        fields.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

// ============= EXPORT =============

export async function exportCustomers(): Promise<string> {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const customers = await db.customer.findMany({
    where: { labId: user.labId },
    orderBy: { code: "asc" },
  })

  const headers = ["code", "name", "company", "email", "phone", "address", "contactPerson", "trn", "paymentTerm", "status"]
  const rows = customers.map((c) =>
    [c.code, c.name, c.company, c.email, c.phone, c.address, c.contactPerson, c.trn, c.paymentTerm, c.status]
      .map(escapeCsvField)
      .join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}

export async function exportSampleTypes(): Promise<string> {
  const session = await requirePermission("admin", "view")
  const user = session.user as any

  const sampleTypes = await db.sampleType.findMany({
    where: { labId: user.labId },
    orderBy: { name: "asc" },
  })

  const headers = ["name", "description", "specificationStandard", "status", "tests"]
  const rows = sampleTypes.map((st) =>
    [st.name, st.description, st.specificationStandard, st.status, st.defaultTests]
      .map(escapeCsvField)
      .join(",")
  )

  return [headers.join(","), ...rows].join("\n")
}

// ============= IMPORT =============

export async function importCustomers(csvContent: string): Promise<{
  created: number
  updated: number
  errors: string[]
}> {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any
  const labId = user.labId

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { created: 0, updated: 0, errors: ["CSV file is empty or has no data rows"] }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const nameIdx = headers.indexOf("name")
  if (nameIdx === -1) return { created: 0, updated: 0, errors: ["Missing required 'name' column"] }

  const codeIdx = headers.indexOf("code")
  const companyIdx = headers.indexOf("company")
  const emailIdx = headers.indexOf("email")
  const phoneIdx = headers.indexOf("phone")
  const addressIdx = headers.indexOf("address")
  const contactPersonIdx = headers.indexOf("contactperson")
  const trnIdx = headers.indexOf("trn")
  const paymentTermIdx = headers.indexOf("paymentterm")
  const statusIdx = headers.indexOf("status")

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const name = fields[nameIdx]?.trim()
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name`)
      continue
    }

    const rowData = {
      name,
      company: companyIdx >= 0 ? fields[companyIdx]?.trim() || null : null,
      email: emailIdx >= 0 ? fields[emailIdx]?.trim() || null : null,
      phone: phoneIdx >= 0 ? fields[phoneIdx]?.trim() || null : null,
      address: addressIdx >= 0 ? fields[addressIdx]?.trim() || null : null,
      contactPerson: contactPersonIdx >= 0 ? fields[contactPersonIdx]?.trim() || null : null,
      trn: trnIdx >= 0 ? fields[trnIdx]?.trim() || null : null,
      paymentTerm: paymentTermIdx >= 0 ? fields[paymentTermIdx]?.trim() || null : null,
      status: statusIdx >= 0 ? fields[statusIdx]?.trim() || "active" : "active",
    }

    try {
      const code = codeIdx >= 0 ? fields[codeIdx]?.trim() : ""
      if (code) {
        // Try to find existing by code
        const existing = await db.customer.findFirst({ where: { labId, code } })
        if (existing) {
          await db.customer.update({ where: { id: existing.id }, data: rowData })
          updated++
          continue
        }
      }

      // Create new — auto-generate code
      const namePrefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")
      const count = await db.customer.count({ where: { labId } })
      const newCode = code || `SP-${namePrefix}-${String(count + 1).padStart(3, "0")}`

      await db.customer.create({
        data: { ...rowData, code: newCode, labId },
      })
      created++
    } catch (e: any) {
      errors.push(`Row ${i + 1} (${name}): ${e.message}`)
    }
  }

  await logAudit(labId, user.id, user.name, "admin", "import", `Imported customers: ${created} created, ${updated} updated`)
  revalidatePath("/masters/customers")

  return { created, updated, errors }
}

export async function importSampleTypes(csvContent: string): Promise<{
  created: number
  updated: number
  errors: string[]
}> {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any
  const labId = user.labId

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { created: 0, updated: 0, errors: ["CSV file is empty or has no data rows"] }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const nameIdx = headers.indexOf("name")
  if (nameIdx === -1) return { created: 0, updated: 0, errors: ["Missing required 'name' column"] }

  const descIdx = headers.indexOf("description")
  const specIdx = headers.indexOf("specificationstandard")
  const statusIdx = headers.indexOf("status")
  const testsIdx = headers.indexOf("tests")

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    const name = fields[nameIdx]?.trim()
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name`)
      continue
    }

    const specStandard = specIdx >= 0 ? fields[specIdx]?.trim() || null : null
    const description = descIdx >= 0 ? fields[descIdx]?.trim() || null : null
    const status = statusIdx >= 0 ? fields[statusIdx]?.trim() || "active" : "active"
    let defaultTests = "[]"

    if (testsIdx >= 0 && fields[testsIdx]?.trim()) {
      try {
        JSON.parse(fields[testsIdx].trim())
        defaultTests = fields[testsIdx].trim()
      } catch {
        errors.push(`Row ${i + 1} (${name}): Invalid tests JSON`)
        continue
      }
    }

    try {
      // Match by name + specificationStandard (unique key)
      const existing = await db.sampleType.findFirst({
        where: { labId, name, specificationStandard: specStandard },
      })

      if (existing) {
        await db.sampleType.update({
          where: { id: existing.id },
          data: { description, status, defaultTests },
        })
        updated++
      } else {
        await db.sampleType.create({
          data: { name, description, specificationStandard: specStandard, defaultTests, status, labId },
        })
        created++
      }
    } catch (e: any) {
      errors.push(`Row ${i + 1} (${name}): ${e.message}`)
    }
  }

  await logAudit(labId, user.id, user.name, "admin", "import", `Imported sample types: ${created} created, ${updated} updated`)
  revalidatePath("/masters/sample-types")

  return { created, updated, errors }
}
