"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/shared/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Info, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateLabSettings, updateZohoSettings } from "@/actions/settings"
import { testZohoConnection } from "@/actions/zoho-sync"

interface Lab {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  trn: string | null
  logo: string | null
  zohoClientId: string | null
  zohoClientSecret: string | null
  zohoRefreshToken: string | null
  zohoOrgId: string | null
  zohoApiDomain: string | null
  createdAt: string
  updatedAt: string
}

const ZOHO_REGIONS = [
  { value: "https://www.zohoapis.com", label: "US (zohoapis.com)" },
  { value: "https://www.zohoapis.eu", label: "EU (zohoapis.eu)" },
  { value: "https://www.zohoapis.in", label: "India (zohoapis.in)" },
  { value: "https://www.zohoapis.com.au", label: "Australia (zohoapis.com.au)" },
  { value: "https://www.zohoapis.jp", label: "Japan (zohoapis.jp)" },
  { value: "https://www.zohoapis.ca", label: "Canada (zohoapis.ca)" },
]

export function SettingsClient({ lab }: { lab: Lab | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: lab?.name || "",
    code: lab?.code || "",
    address: lab?.address || "",
    phone: lab?.phone || "",
    email: lab?.email || "",
    website: lab?.website || "",
    trn: lab?.trn || "",
  })
  const [zohoData, setZohoData] = useState({
    zohoClientId: lab?.zohoClientId || "",
    zohoClientSecret: lab?.zohoClientSecret || "",
    zohoRefreshToken: lab?.zohoRefreshToken || "",
    zohoOrgId: lab?.zohoOrgId || "",
    zohoApiDomain: lab?.zohoApiDomain || "https://www.zohoapis.com",
  })
  const [zohoLoading, setZohoLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error("Lab name is required")
      return
    }

    setLoading(true)
    try {
      await updateLabSettings({
        name: formData.name,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website || undefined,
        trn: formData.trn || undefined,
      })
      toast.success("Settings saved successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveZoho() {
    setZohoLoading(true)
    try {
      await updateZohoSettings({
        zohoClientId: zohoData.zohoClientId || undefined,
        zohoClientSecret: zohoData.zohoClientSecret || undefined,
        zohoRefreshToken: zohoData.zohoRefreshToken || undefined,
        zohoOrgId: zohoData.zohoOrgId || undefined,
        zohoApiDomain: zohoData.zohoApiDomain || undefined,
      })
      toast.success("Zoho settings saved successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save Zoho settings")
    } finally {
      setZohoLoading(false)
    }
  }

  async function handleTestConnection() {
    setTestingConnection(true)
    setConnectionStatus(null)
    try {
      const result = await testZohoConnection()
      setConnectionStatus({
        success: result.success,
        message: result.success
          ? `Connected to ${result.orgName}`
          : result.message,
      })
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: error.message || "Connection test failed",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const zohoConfigured = !!(lab?.zohoClientId && lab?.zohoClientSecret && lab?.zohoRefreshToken && lab?.zohoOrgId)

  const [today, setToday] = useState("")
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage laboratory settings and configuration"
      />

      {/* Lab Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Laboratory Information</CardTitle>
          <CardDescription>
            View and manage your laboratory details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lab-name">Lab Name</Label>
                <Input
                  id="lab-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Laboratory name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lab-code">Lab Code</Label>
                <Input
                  id="lab-code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Lab code"
                  disabled
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lab-address">Address</Label>
              <Input
                id="lab-address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Laboratory address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lab-phone">Phone</Label>
                <Input
                  id="lab-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lab-email">Email</Label>
                <Input
                  id="lab-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lab-website">Website</Label>
                <Input
                  id="lab-website"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lab-trn">TRN</Label>
                <Input
                  id="lab-trn"
                  value={formData.trn}
                  onChange={(e) =>
                    setFormData({ ...formData, trn: e.target.value })
                  }
                  placeholder="Tax Registration Number"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Zoho Books Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zoho Books Integration</CardTitle>
              <CardDescription>
                Connect to Zoho Books to sync customers and invoices
              </CardDescription>
            </div>
            <Badge variant={zohoConfigured ? "default" : "secondary"}>
              {zohoConfigured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zoho-client-id">Client ID</Label>
                <Input
                  id="zoho-client-id"
                  value={zohoData.zohoClientId}
                  onChange={(e) => setZohoData({ ...zohoData, zohoClientId: e.target.value })}
                  placeholder="Zoho OAuth Client ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zoho-client-secret">Client Secret</Label>
                <Input
                  id="zoho-client-secret"
                  type="password"
                  value={zohoData.zohoClientSecret}
                  onChange={(e) => setZohoData({ ...zohoData, zohoClientSecret: e.target.value })}
                  placeholder="Zoho OAuth Client Secret"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zoho-refresh-token">Refresh Token</Label>
              <Input
                id="zoho-refresh-token"
                type="password"
                value={zohoData.zohoRefreshToken}
                onChange={(e) => setZohoData({ ...zohoData, zohoRefreshToken: e.target.value })}
                placeholder="Zoho OAuth Refresh Token"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zoho-org-id">Organization ID</Label>
                <Input
                  id="zoho-org-id"
                  value={zohoData.zohoOrgId}
                  onChange={(e) => setZohoData({ ...zohoData, zohoOrgId: e.target.value })}
                  placeholder="Zoho Organization ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zoho-region">API Region</Label>
                <Select
                  value={zohoData.zohoApiDomain}
                  onValueChange={(val) => setZohoData({ ...zohoData, zohoApiDomain: val })}
                >
                  <SelectTrigger id="zoho-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZOHO_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {connectionStatus && (
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  connectionStatus.success
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {connectionStatus.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {connectionStatus.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveZoho} disabled={zohoLoading}>
                {zohoLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Save Zoho Settings"
                )}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
                {testingConnection ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Technical details about your LIMS installation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-sm text-muted-foreground">Spectrum LIMS 2026.1</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Last Updated</p>
                <p className="text-sm text-muted-foreground">{today}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
