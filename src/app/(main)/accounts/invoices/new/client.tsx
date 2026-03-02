"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2, Search, FileText } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SearchableSelect } from "@/components/shared/searchable-select"

import { createInvoice, getReportsForInvoice } from "@/actions/invoices"

// ============= TYPES =============

type CustomerOption = {
  id: string
  name: string
  company: string | null
  paymentTerm: string | null
}

type ReportOption = {
  id: string
  reportNumber: string
  sampleId: string
  sampleNumber: string
  sampleTypeName: string
  sampleQuantity: string | null
  alreadyInvoiced: boolean
  testResults: Array<{
    id: string
    parameter: string
    testMethod: string | null
    unit: string | null
  }>
  defaultTests: Array<{
    parameter: string
    method?: string
    unit?: string
    price?: number
  }>
}

type LineItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  sampleId: string
  reportId: string
}

// ============= HELPERS =============

let lineItemCounter = 0
function nextLineId(): string {
  return `line-${++lineItemCounter}`
}

function calculateDueDate(paymentTerm: string | null): string {
  if (!paymentTerm) return ""
  const match = paymentTerm.match(/(\d+)/)
  if (match) {
    const days = parseInt(match[1])
    const due = new Date()
    due.setDate(due.getDate() + days)
    return format(due, "yyyy-MM-dd")
  }
  return ""
}

function reportToLineItems(report: ReportOption): LineItem[] {
  return report.testResults.map((tr) => {
    const defaultTest = report.defaultTests.find(
      (dt) => dt.parameter.toLowerCase() === tr.parameter.toLowerCase()
    )
    const method = tr.testMethod || defaultTest?.method || ""
    const description = method
      ? `${tr.parameter} (${method})`
      : tr.parameter

    return {
      id: nextLineId(),
      description,
      quantity: 1,
      unitPrice: defaultTest?.price || 0,
      discount: 0,
      sampleId: report.sampleId,
      reportId: report.id,
    }
  })
}

function formatCurrency(amount: number): string {
  return `AED ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ============= COMPONENT =============

export function NewInvoiceClient({ customers, invoiceType }: { customers: CustomerOption[]; invoiceType: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const isProforma = invoiceType === "proforma"
  const backHref = isProforma ? "/accounts/proforma" : "/accounts/invoices"

  // Client selection
  const [clientId, setClientId] = useState("")
  const selectedCustomer = customers.find((c) => c.id === clientId)

  // Reports
  const [reports, setReports] = useState<ReportOption[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportSearch, setReportSearch] = useState("")

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Invoice fields
  const [taxRate, setTaxRate] = useState(5)
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [additionalCharges, setAdditionalCharges] = useState(0)

  // Computed totals
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems]
  )
  const discountTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.discount, 0),
    [lineItems]
  )
  const afterDiscount = subtotal - discountTotal + additionalCharges
  const taxAmount = afterDiscount * taxRate / 100
  const grandTotal = afterDiscount + taxAmount

  // Customer options for SearchableSelect
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.company ? `${c.company} (${c.name})` : c.name,
  }))

  // Filtered reports by search
  const filteredReports = useMemo(() => {
    if (!reportSearch.trim()) return reports
    const q = reportSearch.toLowerCase()
    return reports.filter(
      (r) =>
        r.reportNumber.toLowerCase().includes(q) ||
        r.sampleNumber.toLowerCase().includes(q) ||
        r.sampleTypeName.toLowerCase().includes(q)
    )
  }, [reports, reportSearch])

  // Track which reports are already added
  const addedReportIds = useMemo(
    () => new Set(lineItems.map((li) => li.reportId).filter(Boolean)),
    [lineItems]
  )

  // ============= HANDLERS =============

  const handleClientChange = async (id: string) => {
    setClientId(id)
    setLineItems([])
    setReports([])
    setReportSearch("")

    const customer = customers.find((c) => c.id === id)
    if (customer?.paymentTerm) {
      setDueDate(calculateDueDate(customer.paymentTerm))
    } else {
      setDueDate("")
    }

    if (id) {
      setReportsLoading(true)
      try {
        const data = await getReportsForInvoice(id)
        setReports(data)
      } catch {
        toast.error("Failed to load reports")
      } finally {
        setReportsLoading(false)
      }
    }
  }

  const handleAddReport = (report: ReportOption) => {
    const items = reportToLineItems(report)
    setLineItems((prev) => [...prev, ...items])
  }

  const handleAddManualItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: nextLineId(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        sampleId: "",
        reportId: "",
      },
    ])
  }

  const handleRemoveItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Please select a client")
      return
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item")
      return
    }
    const emptyItems = lineItems.filter((li) => !li.description.trim())
    if (emptyItems.length > 0) {
      toast.error("All line items must have a description")
      return
    }

    setSaving(true)
    try {
      await createInvoice({
        clientId,
        invoiceType,
        items: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          discount: li.discount,
          sampleId: li.sampleId || undefined,
          reportId: li.reportId || undefined,
        })),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        taxRate,
        additionalCharges: additionalCharges || undefined,
      })
      toast.success(`${isProforma ? "Proforma" : "Tax"} invoice created`)
      router.push(backHref)
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  // ============= RENDER =============

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create {isProforma ? "Proforma Invoice" : "Tax Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isProforma ? "Create a new proforma invoice" : "Create a new tax invoice"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
          {/* Row 1: Client & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px_120px] gap-4 items-end">
            <div className="grid gap-1.5">
              <Label>Client *</Label>
              <SearchableSelect
                options={customerOptions}
                value={clientId}
                onValueChange={handleClientChange}
                placeholder="Select a client..."
                searchPlaceholder="Search clients..."
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment Terms</Label>
              <Input
                value={selectedCustomer?.paymentTerm || "-"}
                readOnly
                className="bg-muted/50"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Reports Selection */}
          {clientId && (
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Add Reports</CardTitle>
                  {reportsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {reports.length === 0 && !reportsLoading ? (
                  <p className="text-xs text-muted-foreground py-2">No approved/published reports found for this client.</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="h-8 text-xs pl-8"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
                      {filteredReports.map((report) => {
                        const isAdded = addedReportIds.has(report.id)
                        return (
                          <div
                            key={report.id}
                            className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/30"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-medium">
                                  {report.reportNumber}
                                  <span className="font-normal text-muted-foreground ml-2">
                                    {report.sampleNumber} — {report.sampleTypeName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {report.testResults.length} parameter(s)
                                  {report.sampleQuantity && <> — Qty: {report.sampleQuantity}</>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {report.alreadyInvoiced && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Invoiced</Badge>
                              )}
                              {isAdded ? (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">Added</Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => handleAddReport(report)}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Line Items ({lineItems.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddManualItem}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Manual Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {lineItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No line items yet. Add reports above or add manual items.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[30px]">#</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs w-[80px]">Qty</TableHead>
                      <TableHead className="text-xs w-[120px]">Unit Price</TableHead>
                      <TableHead className="text-xs w-[100px]">Discount</TableHead>
                      <TableHead className="text-xs w-[120px] text-right">Total</TableHead>
                      <TableHead className="text-xs w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, idx) => {
                      const lineTotal = item.quantity * item.unitPrice - item.discount
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs text-muted-foreground py-1.5">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              value={item.description}
                              onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                              placeholder="Description..."
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.discount}
                              onChange={(e) => handleUpdateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs"
                            />
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono py-1.5">
                            {formatCurrency(lineTotal)}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Totals Summary */}
              {lineItems.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className="w-[300px] space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Discount</span>
                        <span className="font-mono">-{formatCurrency(discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Additional Charges</span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={additionalCharges || ""}
                        onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="h-7 text-xs w-[120px] text-right font-mono"
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                      <span className="font-mono">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-1.5">
                      <span>Grand Total</span>
                      <span className="font-mono">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this invoice..."
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href={backHref}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create ${isProforma ? "Proforma" : "Tax Invoice"}`
              )}
            </Button>
          </div>
      </div>
    </div>
  )
}
