/**
 * Zoho Books API client
 * Handles OAuth token management and API requests
 */

// In-memory token cache: labId → { token, expiresAt }
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

interface ZohoLab {
  id: string
  zohoClientId: string | null
  zohoClientSecret: string | null
  zohoRefreshToken: string | null
  zohoOrgId: string | null
  zohoApiDomain: string | null
}

/**
 * Derive the Zoho accounts URL from the API domain
 * e.g. "https://www.zohoapis.com" → "https://accounts.zoho.com"
 */
function getAccountsUrl(apiDomain: string): string {
  const domainMap: Record<string, string> = {
    "https://www.zohoapis.com": "https://accounts.zoho.com",
    "https://www.zohoapis.eu": "https://accounts.zoho.eu",
    "https://www.zohoapis.in": "https://accounts.zoho.in",
    "https://www.zohoapis.com.au": "https://accounts.zoho.com.au",
    "https://www.zohoapis.jp": "https://accounts.zoho.jp",
    "https://www.zohoapis.ca": "https://accounts.zoho.ca",
  }
  return domainMap[apiDomain] || "https://accounts.zoho.com"
}

function validateZohoConfig(
  lab: ZohoLab
): lab is ZohoLab & {
  zohoClientId: string
  zohoClientSecret: string
  zohoRefreshToken: string
  zohoOrgId: string
  zohoApiDomain: string
} {
  return !!(
    lab.zohoClientId &&
    lab.zohoClientSecret &&
    lab.zohoRefreshToken &&
    lab.zohoOrgId &&
    lab.zohoApiDomain
  )
}

/**
 * Get a valid access token, using cache if available
 */
async function getAccessToken(lab: ZohoLab): Promise<string> {
  if (!validateZohoConfig(lab)) {
    throw new Error("Zoho Books is not configured. Please set up credentials in Settings.")
  }

  // Check cache
  const cached = tokenCache.get(lab.id)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  const accountsUrl = getAccountsUrl(lab.zohoApiDomain)

  const params = new URLSearchParams({
    refresh_token: lab.zohoRefreshToken,
    client_id: lab.zohoClientId,
    client_secret: lab.zohoClientSecret,
    grant_type: "refresh_token",
  })

  const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zoho auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(`Zoho auth error: ${data.error}`)
  }

  // Cache for 50 minutes (tokens last 60 min)
  tokenCache.set(lab.id, {
    token: data.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  })

  return data.access_token
}

/**
 * Clear cached token (used on 401 retry)
 */
function clearTokenCache(labId: string) {
  tokenCache.delete(labId)
}

/**
 * Make an authenticated request to Zoho Books API
 */
export async function zohoFetch(
  lab: ZohoLab,
  path: string,
  params?: Record<string, string>
): Promise<any> {
  if (!validateZohoConfig(lab)) {
    throw new Error("Zoho Books is not configured.")
  }

  const token = await getAccessToken(lab)

  const url = new URL(`${lab.zohoApiDomain}/books/v3/${path}`)
  url.searchParams.set("organization_id", lab.zohoOrgId)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  let res = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })

  // Retry once on 401 (token may have expired)
  if (res.status === 401) {
    clearTokenCache(lab.id)
    const newToken = await getAccessToken(lab)
    res = await fetch(url.toString(), {
      headers: { Authorization: `Zoho-oauthtoken ${newToken}` },
    })
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zoho API error (${res.status}): ${text}`)
  }

  return res.json()
}

/**
 * Fetch all customer contacts from Zoho Books (handles pagination)
 */
export async function fetchAllContacts(lab: ZohoLab): Promise<any[]> {
  const allContacts: any[] = []
  let page = 1
  const perPage = 200

  while (true) {
    const data = await zohoFetch(lab, "contacts", {
      contact_type: "customer",
      per_page: String(perPage),
      page: String(page),
    })

    if (data.contacts && Array.isArray(data.contacts)) {
      allContacts.push(...data.contacts)
    }

    // Check if there are more pages
    const pageContext = data.page_context
    if (!pageContext || !pageContext.has_more_page) {
      break
    }

    page++
  }

  return allContacts
}

export { validateZohoConfig }
export type { ZohoLab }
