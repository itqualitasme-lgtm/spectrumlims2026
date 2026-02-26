"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ImageUpload } from "@/components/shared/image-upload"
import { createReportTemplate } from "@/actions/report-templates"

export function NewReportTemplateClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formName, setFormName] = useState("")
  const [formHeaderText, setFormHeaderText] = useState("")
  const [formFooterText, setFormFooterText] = useState(
    "This report shall not be reproduced except in full, without the written approval of the laboratory.\nThe results relate only to the items tested."
  )
  const [formLogoUrl, setFormLogoUrl] = useState("")
  const [formAccreditationLogoUrl, setFormAccreditationLogoUrl] = useState("")
  const [formAccreditationText, setFormAccreditationText] = useState("")
  const [formSealUrl, setFormSealUrl] = useState("")
  const [formShowLabLogo, setFormShowLabLogo] = useState(true)
  const [formIsDefault, setFormIsDefault] = useState(false)

  async function handleSubmit() {
    if (!formName.trim()) {
      toast.error("Template name is required")
      return
    }

    setLoading(true)
    try {
      await createReportTemplate({
        name: formName.trim(),
        headerText: formHeaderText || undefined,
        footerText: formFooterText || undefined,
        logoUrl: formLogoUrl || undefined,
        accreditationLogoUrl: formAccreditationLogoUrl || undefined,
        accreditationText: formAccreditationText || undefined,
        sealUrl: formSealUrl || undefined,
        showLabLogo: formShowLabLogo,
        isDefault: formIsDefault,
      })
      toast.success("Template created successfully")
      router.push("/admin/report-templates")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/report-templates">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <PageHeader
          title="New Report Template"
          description="Configure header text, footer disclaimers, and logos for this template"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Template Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard COA, Fuel Testing, Oil Analysis"
                />
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} />
                  <Label className="text-sm">Default Template</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formShowLabLogo} onCheckedChange={setFormShowLabLogo} />
                  <Label className="text-sm">Show Lab Logo</Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Header Text</Label>
              <Textarea
                value={formHeaderText}
                onChange={(e) => setFormHeaderText(e.target.value)}
                placeholder={"e.g. An ISO/IEC 17025:2017 Accredited Laboratory\nAccreditation No: CAB-XXX\nEmirates National Accreditation System (ENAS)"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown below the lab name. Each line is a separate row (accreditation, certifications, etc.)
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Footer Text</Label>
              <Textarea
                value={formFooterText}
                onChange={(e) => setFormFooterText(e.target.value)}
                placeholder={"This report shall not be reproduced except in full...\nThe results relate only to the items tested."}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown at the bottom of every page as disclaimer text.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Accreditation Text</Label>
              <Input
                value={formAccreditationText}
                onChange={(e) => setFormAccreditationText(e.target.value)}
                placeholder="e.g. ISO/IEC 17025:2017 Accredited | ENAS CAB-XXX"
              />
              <p className="text-xs text-muted-foreground">
                Short accreditation line shown alongside logos in the header.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logos & Seal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lab/Company Logo</Label>
                <ImageUpload
                  value={formLogoUrl}
                  onChange={setFormLogoUrl}
                  folder="logos"
                  placeholder="Upload or paste logo URL..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Accreditation Logo</Label>
                <ImageUpload
                  value={formAccreditationLogoUrl}
                  onChange={setFormAccreditationLogoUrl}
                  folder="logos"
                  placeholder="Upload or paste accreditation logo..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Company Digital Seal</Label>
              <ImageUpload
                value={formSealUrl}
                onChange={setFormSealUrl}
                folder="seals"
                placeholder="Upload company digital seal image..."
              />
              <p className="text-xs text-muted-foreground">
                Displayed next to the Lab Manager signature on reports. PNG with transparent background recommended.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/report-templates">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
          ) : (
            "Create Template"
          )}
        </Button>
      </div>
    </div>
  )
}
