"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { updateSampleType } from "@/actions/sample-types"
import Link from "next/link"

interface SampleType {
  id: string
  name: string
  description: string | null
  specificationStandard: string | null
  defaultTests: string
  status: string
  labId: string
  createdAt: string
}

type TestParam = {
  parameter: string
  method: string
  unit: string
  price: string
  tat: string
  specMin: string
  specMax: string
}

function parseTests(defaultTests: string): TestParam[] {
  try {
    const parsed = JSON.parse(defaultTests)
    if (!Array.isArray(parsed)) return []
    return parsed.map((t: any) => ({
      parameter: t.parameter || "",
      method: t.method || t.testMethod || "",
      unit: t.unit || "",
      price: t.price != null ? String(t.price) : "",
      tat: t.tat != null ? String(t.tat) : "",
      specMin: t.specMin || "",
      specMax: t.specMax || "",
    }))
  } catch {
    return []
  }
}

function serializeTests(tests: TestParam[]): string {
  const cleaned = tests
    .filter((t) => t.parameter.trim())
    .map((t) => {
      const obj: Record<string, any> = { parameter: t.parameter.trim() }
      if (t.method.trim()) obj.method = t.method.trim()
      if (t.unit.trim()) obj.unit = t.unit.trim()
      if (t.price.trim()) obj.price = parseFloat(t.price) || 0
      if (t.tat.trim()) obj.tat = parseInt(t.tat) || 0
      if (t.specMin.trim()) obj.specMin = t.specMin.trim()
      if (t.specMax.trim()) obj.specMax = t.specMax.trim()
      return obj
    })
  return JSON.stringify(cleaned)
}

const emptyParam = (): TestParam => ({
  parameter: "",
  method: "",
  unit: "",
  price: "",
  tat: "",
  specMin: "",
  specMax: "",
})

export function EditSampleTypeClient({ sampleType }: { sampleType: SampleType }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formName, setFormName] = useState(sampleType.name)
  const [formDescription, setFormDescription] = useState(sampleType.description || "")
  const [formSpecStandard, setFormSpecStandard] = useState(sampleType.specificationStandard || "")
  const [formStatus, setFormStatus] = useState(sampleType.status)
  const initialTests = parseTests(sampleType.defaultTests)
  const [formTests, setFormTests] = useState<TestParam[]>(
    initialTests.length > 0 ? initialTests : [emptyParam()]
  )

  const updateTest = (index: number, field: keyof TestParam, value: string) => {
    setFormTests((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  const addTest = () => setFormTests((prev) => [...prev, emptyParam()])

  const removeTest = (index: number) => {
    if (formTests.length <= 1) return
    setFormTests((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      toast.error("Sample type name is required")
      return
    }

    const hasAnyParam = formTests.some((t) => t.parameter.trim())
    if (!hasAnyParam) {
      toast.error("Add at least one test parameter")
      return
    }

    setLoading(true)
    try {
      await updateSampleType(sampleType.id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        specificationStandard: formSpecStandard.trim() || undefined,
        defaultTests: serializeTests(formTests),
        status: formStatus,
      })
      toast.success("Sample type updated successfully")
      router.push("/masters/sample-types")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update sample type")
    } finally {
      setLoading(false)
    }
  }

  const validCount = formTests.filter((t) => t.parameter.trim()).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/masters/sample-types">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
        <PageHeader
          title={`Edit: ${sampleType.name}`}
          description="Update sample type details and test parameters"
        />
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample Type Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Gas Oil"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="specStandard">Specification Standard</Label>
              <Input
                id="specStandard"
                value={formSpecStandard}
                onChange={(e) => setFormSpecStandard(e.target.value)}
                placeholder="e.g. ISO 8217: 2024"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Test Parameters</CardTitle>
              <Badge variant="secondary">{validCount}</Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTest}>
              <Plus className="mr-1 h-4 w-4" /> Add Parameter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead className="min-w-[180px]">Parameter *</TableHead>
                  <TableHead className="min-w-[160px]">Method</TableHead>
                  <TableHead className="min-w-[80px]">Unit</TableHead>
                  <TableHead className="min-w-[90px]">Price</TableHead>
                  <TableHead className="min-w-[70px]">TAT (days)</TableHead>
                  <TableHead className="min-w-[90px]">Spec Min</TableHead>
                  <TableHead className="min-w-[90px]">Spec Max</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTests.map((test, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={test.parameter}
                        onChange={(e) => updateTest(idx, "parameter", e.target.value)}
                        placeholder="e.g. Flash Point"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={test.method}
                        onChange={(e) => updateTest(idx, "method", e.target.value)}
                        placeholder="e.g. ASTM D93"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={test.unit}
                        onChange={(e) => updateTest(idx, "unit", e.target.value)}
                        placeholder="°C"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        type="number"
                        min="0"
                        step="0.01"
                        value={test.price}
                        onChange={(e) => updateTest(idx, "price", e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        type="number"
                        min="1"
                        max="30"
                        value={test.tat}
                        onChange={(e) => updateTest(idx, "tat", e.target.value)}
                        placeholder="days"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={test.specMin}
                        onChange={(e) => updateTest(idx, "specMin", e.target.value)}
                        placeholder="min"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm"
                        value={test.specMax}
                        onChange={(e) => updateTest(idx, "specMax", e.target.value)}
                        placeholder="max"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeTest(idx)}
                        disabled={formTests.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/masters/sample-types">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            "Update Sample Type"
          )}
        </Button>
      </div>
    </div>
  )
}
