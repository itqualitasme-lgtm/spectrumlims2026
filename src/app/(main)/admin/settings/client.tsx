"use client"

import { useState } from "react"
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
import { Info, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateLabSettings } from "@/actions/settings"

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
  createdAt: string
  updatedAt: string
}

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

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

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
