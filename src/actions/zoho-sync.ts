"use server"

import { db } from "@/lib/db"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { zohoFetch, fetchAllContacts, validateZohoConfig } from "@/lib/zoho"

/**
 * Test Zoho Books connection with current lab credentials
 */
export async function testZohoConnection(): Promise<{
  success: boolean
  message: string
  orgName?: string
}> {
  const session = await requirePermission("admin", "edit")
  const user = session.user as any

  const lab = await db.lab.findFirst({
    where: { id: user.labId },
    select: {
      id: true,
      zohoClientId: true,
      zohoClientSecret: true,
      zohoRefreshToken: true,
      zohoOrgId: true,
      zohoApiDomain: true,
    },
  })

  if (!lab || !validateZohoConfig(lab)) {
    return { success: false, message: "Zoho Books is not configured. Please enter all credentials." }
  }

  try {
    const data = await zohoFetch(lab, "organizations")
    const orgs = data.organizations || []
    const org = orgs.find((o: any) => o.organization_id === lab.zohoOrgId)
    return {
      success: true,
      message: "Connected successfully",
      orgName: org?.name || "Unknown Organization",
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to connect to Zoho Books",
    }
  }
}

/**
 * Format a Zoho billing address object into a single string
 */
function formatAddress(addr: any): string | null {
  if (!addr) return null
  const parts = [
    addr.attention,
    addr.address,
    addr.street2,
    addr.city,
    addr.state,
    addr.zip,
    addr.country,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

/**
 * Sync all customers from Zoho Books into LIMS
 */
export async function syncZohoCustomers(): Promise<{
  success: boolean
  created: number
  updated: number
  total: number
  message: string
}> {
  const session = await requirePermission("masters", "edit")
  const user = session.user as any
  const labId = user.labId

  const lab = await db.lab.findFirst({
    where: { id: labId },
    select: {
      id: true,
      zohoClientId: true,
      zohoClientSecret: true,
      zohoRefreshToken: true,
      zohoOrgId: true,
      zohoApiDomain: true,
    },
  })

  if (!lab || !validateZohoConfig(lab)) {
    return { success: false, created: 0, updated: 0, total: 0, message: "Zoho Books is not configured." }
  }

  try {
    // Fetch all contacts from Zoho
    const contacts = await fetchAllContacts(lab)

    // Get existing customers for this lab (indexed by zohoContactId and by name for fallback matching)
    const existingCustomers = await db.customer.findMany({
      where: { labId },
      select: { id: true, zohoContactId: true, name: true, company: true, code: true },
    })

    const byZohoId = new Map<string, typeof existingCustomers[0]>()
    const byName = new Map<string, typeof existingCustomers[0]>()
    for (const c of existingCustomers) {
      if (c.zohoContactId) byZohoId.set(c.zohoContactId, c)
      // Fallback: match by name or company for first sync
      byName.set(c.name.toLowerCase(), c)
      if (c.company) byName.set(c.company.toLowerCase(), c)
    }

    let created = 0
    let updated = 0

    // Get current customer count for code generation
    let customerCount = await db.customer.count({ where: { labId } })

    for (const contact of contacts) {
      const zohoId = String(contact.contact_id)
      const contactName = contact.contact_name || ""
      const companyName = contact.company_name || ""
      const primaryPerson = contact.contact_persons?.[0]
      const email = primaryPerson?.email || null
      const phone = primaryPerson?.phone || primaryPerson?.mobile || null
      const address = formatAddress(contact.billing_address)
      const contactPersonName = primaryPerson
        ? [primaryPerson.first_name, primaryPerson.last_name].filter(Boolean).join(" ")
        : null
      const trn = contact.tax_id || contact.gst_no || null
      const paymentTerm = contact.payment_terms_label || (contact.payment_terms ? String(contact.payment_terms) : null)
      const status = contact.status === "inactive" ? "inactive" : "active"

      // Find existing customer: by Zoho ID first, then by name fallback
      let existing = byZohoId.get(zohoId)
      if (!existing) {
        existing = byName.get(contactName.toLowerCase()) || byName.get(companyName.toLowerCase())
      }

      if (existing) {
        // Update existing customer
        await db.customer.update({
          where: { id: existing.id },
          data: {
            name: contactName || existing.name,
            company: companyName || null,
            email,
            phone,
            address,
            contactPerson: contactPersonName,
            trn,
            paymentTerm,
            zohoContactId: zohoId,
            status,
          },
        })

        // Sync contact persons
        await syncContactPersons(existing.id, contact.contact_persons || [])
        updated++
      } else {
        // Create new customer
        customerCount++
        const namePrefix = (contactName || "XXX")
          .replace(/[^a-zA-Z]/g, "")
          .slice(0, 3)
          .toUpperCase()
          .padEnd(3, "X")
        const code = `SP-${namePrefix}-${String(customerCount).padStart(3, "0")}`

        const newCustomer = await db.customer.create({
          data: {
            code,
            name: contactName,
            company: companyName || null,
            email,
            phone,
            address,
            contactPerson: contactPersonName,
            trn,
            paymentTerm,
            zohoContactId: zohoId,
            status,
            labId,
          },
        })

        // Sync contact persons
        await syncContactPersons(newCustomer.id, contact.contact_persons || [])
        created++
      }
    }

    await logAudit(
      labId,
      user.id,
      user.name,
      "zoho-sync",
      "sync",
      `Zoho customer sync: ${created} created, ${updated} updated out of ${contacts.length} contacts`
    )

    revalidatePath("/masters/customers")

    return {
      success: true,
      created,
      updated,
      total: contacts.length,
      message: `Sync complete: ${created} created, ${updated} updated`,
    }
  } catch (error: any) {
    console.error("Zoho sync error:", error)
    return {
      success: false,
      created: 0,
      updated: 0,
      total: 0,
      message: error.message || "Sync failed",
    }
  }
}

/**
 * Sync contact persons from Zoho into LIMS for a given customer
 */
async function syncContactPersons(customerId: string, zohoPersons: any[]) {
  if (!zohoPersons || zohoPersons.length === 0) return

  // Get existing contact persons
  const existing = await db.contactPerson.findMany({
    where: { customerId },
  })

  const existingByName = new Map<string, typeof existing[0]>()
  for (const p of existing) {
    existingByName.set(p.name.toLowerCase(), p)
  }

  for (const zp of zohoPersons) {
    const name = [zp.first_name, zp.last_name].filter(Boolean).join(" ")
    if (!name) continue

    const phone = zp.phone || zp.mobile || null
    const email = zp.email || null
    const designation = zp.designation || null

    const match = existingByName.get(name.toLowerCase())
    if (match) {
      // Update
      await db.contactPerson.update({
        where: { id: match.id },
        data: { email, phone, designation },
      })
    } else {
      // Create
      await db.contactPerson.create({
        data: { customerId, name, email, phone, designation },
      })
    }
  }
}
