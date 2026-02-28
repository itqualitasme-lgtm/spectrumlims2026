"use client"

import { useState, useRef } from "react"
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  exportCustomers,
  exportSampleTypes,
  importCustomers,
  importSampleTypes,
} from "@/actions/import-export"

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportExportClient() {
  const [loading, setLoading] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    errors: string[]
  } | null>(null)
  const customerFileRef = useRef<HTMLInputElement>(null)
  const sampleTypeFileRef = useRef<HTMLInputElement>(null)

  async function handleExport(type: "customers" | "sampleTypes") {
    setLoading(`export-${type}`)
    try {
      const csv = type === "customers" ? await exportCustomers() : await exportSampleTypes()
      const filename = type === "customers" ? "customers.csv" : "sample-types.csv"
      downloadCsv(csv, filename)
      toast.success(`${type === "customers" ? "Customers" : "Sample Types"} exported successfully`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handleImport(type: "customers" | "sampleTypes") {
    const fileRef = type === "customers" ? customerFileRef : sampleTypeFileRef
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error("Please select a CSV file first")
      return
    }

    setLoading(`import-${type}`)
    setImportResult(null)
    try {
      const content = await file.text()
      const result = type === "customers"
        ? await importCustomers(content)
        : await importSampleTypes(content)

      setImportResult(result)

      if (result.errors.length === 0) {
        toast.success(`Import complete: ${result.created} created, ${result.updated} updated`)
      } else {
        toast.warning(`Import complete with ${result.errors.length} error(s)`)
      }

      // Reset file input
      if (fileRef.current) fileRef.current.value = ""
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import / Export"
        description="Bulk import or export customers and sample types via CSV files."
      />

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="sampleTypes">Sample Types</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Customers
                </CardTitle>
                <CardDescription className="text-xs">
                  Download all customers as a CSV file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => handleExport("customers")}
                  disabled={!!loading}
                >
                  {loading === "export-customers" ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                  )}
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Customers
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload a CSV file to create or update customers. Required column: name. Optional: code, company, email, phone, address, contactPerson, trn, paymentTerm, status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={customerFileRef}
                  type="file"
                  accept=".csv"
                  className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                />
                <Button
                  size="sm"
                  onClick={() => handleImport("customers")}
                  disabled={!!loading}
                >
                  {loading === "import-customers" ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  Import
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sampleTypes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Sample Types
                </CardTitle>
                <CardDescription className="text-xs">
                  Download all sample types as a CSV file. Tests are included as a JSON column.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => handleExport("sampleTypes")}
                  disabled={!!loading}
                >
                  {loading === "export-sampleTypes" ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                  )}
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Sample Types
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload a CSV file to create or update sample types. Required column: name. Optional: description, specificationStandard, status, tests (JSON array).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={sampleTypeFileRef}
                  type="file"
                  accept=".csv"
                  className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                />
                <Button
                  size="sm"
                  onClick={() => handleImport("sampleTypes")}
                  disabled={!!loading}
                >
                  {loading === "import-sampleTypes" ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-3.5 w-3.5" />
                  )}
                  Import
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {importResult && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">{importResult.created} created</span>
              <span className="text-blue-600 font-medium">{importResult.updated} updated</span>
              {importResult.errors.length > 0 && (
                <span className="text-destructive font-medium">{importResult.errors.length} error(s)</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <ul className="list-disc list-inside text-xs space-y-0.5 text-destructive">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
