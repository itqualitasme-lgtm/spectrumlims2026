"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Pencil,
  FileText,
  ArrowRightLeft,
  Loader2,
  Plus,
  X,
  Layers,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getCustomersForInvoice,
  getSamplesForInvoice,
  getInvoice,
  convertProformaToTax,
  consolidateProformas,
} from "@/actions/invoices"

type Invoice = {
  id: string
  invoiceNumber: string
  invoiceType: string
  clientId: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  dueDate: string | null
  paidDate: string | null
  notes: string | null
  createdAt: string
  client: {
    id: string
    name: string
    company: string | null
    email: string | null
    address: string | null
    trn: string | null
  }
  createdBy: { name: string }
  _count: { items: number }
}

type InvoiceDetail = Invoice & {
  lab: {
    id: string
    name: string
    code: string
    address: string | null
    phone: string | null
    email: string | null
    trn: string | null
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    total: number
    sampleId: string | null
    sample: { sampleNumber: string } | null
  }>
}

type LineItem = {
  description: string
  quantity: number
  unitPrice: number
  sampleId: string
}

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const isOverdue = (invoice: { status: string; dueDate: string | null }) => {
  if (invoice.status !== "sent" || !invoice.dueDate) return false
  return new Date(invoice.dueDate) < new Date()
}

const statusBadge = (status: string, dueDate?: string | null) => {
  // Auto-detect overdue for sent invoices
  if (status === "sent" && dueDate && new Date(dueDate) < new Date()) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Overdue
      </Badge>
    )
  }

  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "sent":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Sent
        </Badge>
      )
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Paid
        </Badge>
      )
    case "cancelled":
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          Cancelled
        </Badge>
      )
    case "converted":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Converted
        </Badge>
      )
    case "consolidated":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Consolidated
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // Selected invoice for actions
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null)

  // Selection for consolidation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Create form state
  const [invoiceType, setInvoiceType] = useState("tax")
  const [clientId, setClientId] = useState("")
  const [customers, setCustomers] = useState<
    { value: string; label: string }[]
  >([])
  const [samples, setSamples] = useState<
    { value: string; label: string }[]
  >([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, sampleId: "" },
  ])
  const [taxRate, setTaxRate] = useState(5)
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  // Calculated totals
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems]
  )
  const taxAmount = useMemo(() => subtotal * taxRate / 100, [subtotal, taxRate])
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  const handleOpenCreate = async () => {
    try {
      const custs = await getCustomersForInvoice()
      setCustomers(
        custs.map((c) => ({
          value: c.id,
          label: c.company ? `${c.company} (${c.name})` : c.name,
        }))
      )
      setInvoiceType("tax")
      setClientId("")
      setSamples([])
      setLineItems([{ description: "", quantity: 1, unitPrice: 0, sampleId: "" }])
      setTaxRate(5)
      setDueDate("")
      setNotes("")
      setCreateOpen(true)
    } catch {
      toast.error("Failed to load customers")
    }
  }

  const handleClientChange = async (value: string) => {
    setClientId(value)
    if (value) {
      try {
        const smpls = await getSamplesForInvoice(value)
        setSamples(
          smpls.map((s) => ({
            value: s.id,
            label: `${s.sampleNumber} - ${s.typeName}`,
          }))
        )
      } catch {
        setSamples([])
      }
    } else {
      setSamples([])
    }
  }

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unitPrice: 0, sampleId: "" },
    ])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const handleCreate = async () => {
    if (!clientId) {
      toast.error("Please select a customer")
      return
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    )

    if (validItems.length === 0) {
      toast.error("Please add at least one valid line item")
      return
    }

    setLoading(true)
    try {
      const invoice = await createInvoice({
        clientId,
        invoiceType,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sampleId: item.sampleId || undefined,
        })),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        taxRate,
      })
      toast.success(`Invoice ${invoice.invoiceNumber} created successfully`)
      setCreateOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = async (invoice: Invoice) => {
    try {
      const detail = await getInvoice(invoice.id)
      if (!detail) {
        toast.error("Invoice not found")
        return
      }
      setEditingInvoice(invoice)
      const custs = await getCustomersForInvoice()
      setCustomers(
        custs.map((c) => ({
          value: c.id,
          label: c.company ? `${c.company} (${c.name})` : c.name,
        }))
      )
      setClientId(invoice.clientId)
      const smpls = await getSamplesForInvoice(invoice.clientId)
      setSamples(
        smpls.map((s) => ({
          value: s.id,
          label: `${s.sampleNumber} - ${s.typeName}`,
        }))
      )
      setLineItems(
        (detail as any).items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sampleId: item.sampleId || "",
        }))
      )
      setTaxRate(invoice.taxRate)
      setDueDate(invoice.dueDate ? invoice.dueDate.split("T")[0] : "")
      setNotes(invoice.notes || "")
      setEditOpen(true)
    } catch {
      toast.error("Failed to load invoice for editing")
    }
  }

  const handleEdit = async () => {
    if (!editingInvoice || !clientId) return

    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    )

    if (validItems.length === 0) {
      toast.error("Please add at least one valid line item")
      return
    }

    setLoading(true)
    try {
      await updateInvoice(editingInvoice.id, {
        clientId,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sampleId: item.sampleId || undefined,
        })),
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        taxRate,
      })
      toast.success(`Invoice ${editingInvoice.invoiceNumber} updated`)
      setEditOpen(false)
      setEditingInvoice(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update invoice")
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (invoice: Invoice) => {
    try {
      const detail = await getInvoice(invoice.id)
      if (!detail) {
        toast.error("Invoice not found")
        return
      }
      setInvoiceDetail(JSON.parse(JSON.stringify(detail)))
      setDetailOpen(true)
    } catch {
      toast.error("Failed to load invoice details")
    }
  }

  const handleStatusChange = async (invoice: Invoice, status: string) => {
    try {
      await updateInvoiceStatus(invoice.id, status)
      toast.success(
        `Invoice ${invoice.invoiceNumber} marked as ${status}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update invoice status")
    }
  }

  const handleConvertToTax = async (invoice: Invoice) => {
    try {
      const taxInvoice = await convertProformaToTax(invoice.id)
      toast.success(`Converted to tax invoice ${taxInvoice.invoiceNumber}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to convert proforma")
    }
  }

  const handleConsolidate = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length < 2) {
      toast.error("Select at least 2 proforma invoices to consolidate")
      return
    }
    try {
      const taxInvoice = await consolidateProformas(ids)
      toast.success(`Consolidated into tax invoice ${taxInvoice.invoiceNumber}`)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to consolidate proformas")
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (!selectedInvoice) return

    setLoading(true)
    try {
      await deleteInvoice(selectedInvoice.id)
      toast.success(`Invoice ${selectedInvoice.invoiceNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invoice")
    } finally {
      setLoading(false)
    }
  }

  // Proformas that can be consolidated (not already converted/consolidated)
  const consolidatable = invoices.filter(
    (inv) =>
      inv.invoiceType === "proforma" &&
      inv.status !== "converted" &&
      inv.status !== "consolidated"
  )

  const columns: ColumnDef<Invoice, any>[] = [
    {
      id: "select",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const invoice = row.original
        if (invoice.invoiceType !== "proforma" || invoice.status === "converted" || invoice.status === "consolidated") return null
        return (
          <Checkbox
            checked={selectedIds.has(invoice.id)}
            onCheckedChange={() => toggleSelect(invoice.id)}
          />
        )
      },
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.invoiceNumber}</span>
          {row.original.invoiceType === "proforma" && (
            <Badge variant="outline" className="text-xs">Proforma</Badge>
          )}
        </div>
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      id: "itemsCount",
      header: "Items",
      cell: ({ row }) => row.original._count.items,
    },
    {
      accessorKey: "subtotal",
      header: "Subtotal",
      cell: ({ row }) => formatCurrency(row.original.subtotal),
    },
    {
      accessorKey: "taxAmount",
      header: "Tax",
      cell: ({ row }) => formatCurrency(row.original.taxAmount),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold">
          {formatCurrency(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status, row.original.dueDate),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) =>
        row.original.dueDate
          ? format(new Date(row.original.dueDate), "dd MMM yyyy")
          : "-",
    },
    {
      accessorKey: "createdBy.name",
      header: "Created By",
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) =>
        format(new Date(row.original.createdAt), "dd MMM yyyy"),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleViewDetail(invoice)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      window.open(`/api/invoices/${invoice.id}/print`, "_blank")
                    }
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print PDF</TooltipContent>
              </Tooltip>
              {invoice.status === "draft" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(invoice)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStatusChange(invoice, "sent")}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as Sent</TooltipContent>
                  </Tooltip>
                </>
              )}
              {invoice.status === "sent" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStatusChange(invoice, "paid")}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Paid</TooltipContent>
                </Tooltip>
              )}
              {invoice.invoiceType === "proforma" && invoice.status !== "converted" && invoice.status !== "consolidated" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleConvertToTax(invoice)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Convert to Tax Invoice</TooltipContent>
                </Tooltip>
              )}
              {(invoice.status === "draft" || invoice.status === "sent") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStatusChange(invoice, "cancelled")}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              )}
              {invoice.status !== "converted" && invoice.status !== "consolidated" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedInvoice(invoice)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create and manage invoices for lab services"
        actionLabel="Create Invoice"
        onAction={handleOpenCreate}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} proforma(s) selected</span>
          <Button size="sm" onClick={handleConsolidate} disabled={selectedIds.size < 2}>
            <Layers className="mr-2 h-4 w-4" />
            Consolidate to Tax Invoice
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoices..."
        searchKey="invoiceNumber"
      />

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a customer.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Invoice Type */}
            <div className="grid gap-2">
              <Label>Invoice Type *</Label>
              <Select value={invoiceType} onValueChange={setInvoiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax">Tax Invoice</SelectItem>
                  <SelectItem value="proforma">Proforma Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection */}
            <div className="grid gap-2">
              <Label>Customer *</Label>
              <SearchableSelect
                options={customers}
                value={clientId}
                onValueChange={handleClientChange}
                placeholder="Select a customer..."
                searchPlaceholder="Search customers..."
                emptyMessage="No active customers found."
              />
            </div>

            {/* Line Items */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Sample</TableHead>
                      <TableHead className="w-[12%]">Qty</TableHead>
                      <TableHead className="w-[15%]">Unit Price</TableHead>
                      <TableHead className="w-[13%]">Total</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(index, "description", e.target.value)
                            }
                            placeholder="Item description..."
                          />
                        </TableCell>
                        <TableCell>
                          {samples.length > 0 ? (
                            <SearchableSelect
                              options={[
                                { value: "", label: "None" },
                                ...samples,
                              ]}
                              value={item.sampleId}
                              onValueChange={(val) =>
                                updateLineItem(index, "sampleId", val)
                              }
                              placeholder="Link sample"
                              searchPlaceholder="Search samples..."
                              emptyMessage="No samples found."
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Totals and Additional Fields */}
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({taxRate}%)
                    </span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingInvoice(null) }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice {editingInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Update invoice details and line items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Customer Selection */}
            <div className="grid gap-2">
              <Label>Customer *</Label>
              <SearchableSelect
                options={customers}
                value={clientId}
                onValueChange={handleClientChange}
                placeholder="Select a customer..."
                searchPlaceholder="Search customers..."
                emptyMessage="No active customers found."
              />
            </div>

            {/* Line Items */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Sample</TableHead>
                      <TableHead className="w-[12%]">Qty</TableHead>
                      <TableHead className="w-[15%]">Unit Price</TableHead>
                      <TableHead className="w-[13%]">Total</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(index, "description", e.target.value)
                            }
                            placeholder="Item description..."
                          />
                        </TableCell>
                        <TableCell>
                          {samples.length > 0 ? (
                            <SearchableSelect
                              options={[
                                { value: "", label: "None" },
                                ...samples,
                              ]}
                              value={item.sampleId}
                              onValueChange={(val) =>
                                updateLineItem(index, "sampleId", val)
                              }
                              placeholder="Link sample"
                              searchPlaceholder="Search samples..."
                              emptyMessage="No samples found."
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Totals and Additional Fields */}
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({taxRate}%)
                    </span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditOpen(false); setEditingInvoice(null) }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice {invoiceDetail?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Invoice details and line items
            </DialogDescription>
          </DialogHeader>
          {invoiceDetail && (
            <div className="space-y-6 py-4">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Invoice Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number</span>
                      <span className="font-medium">
                        {invoiceDetail.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {statusBadge(invoiceDetail.status, invoiceDetail.dueDate)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>
                        {format(
                          new Date(invoiceDetail.createdAt),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                    {invoiceDetail.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>
                          {format(
                            new Date(invoiceDetail.dueDate),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    {invoiceDetail.paidDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid Date</span>
                        <span>
                          {format(
                            new Date(invoiceDetail.paidDate),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created By</span>
                      <span>{invoiceDetail.createdBy.name}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Bill To
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium">
                      {invoiceDetail.client.company ||
                        invoiceDetail.client.name}
                    </p>
                    {invoiceDetail.client.company && (
                      <p>{invoiceDetail.client.name}</p>
                    )}
                    {invoiceDetail.client.email && (
                      <p className="text-muted-foreground">
                        {invoiceDetail.client.email}
                      </p>
                    )}
                    {invoiceDetail.client.address && (
                      <p className="text-muted-foreground">
                        {invoiceDetail.client.address}
                      </p>
                    )}
                    {invoiceDetail.client.trn && (
                      <p className="text-muted-foreground">
                        TRN: {invoiceDetail.client.trn}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Line Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[5%]">#</TableHead>
                          <TableHead className="w-[45%]">
                            Description
                          </TableHead>
                          <TableHead className="w-[10%]">Qty</TableHead>
                          <TableHead className="w-[20%]">
                            Unit Price
                          </TableHead>
                          <TableHead className="w-[20%]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetail.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                {item.description}
                                {item.sample && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({item.sample.sampleNumber})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(invoiceDetail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax ({invoiceDetail.taxRate}%)
                        </span>
                        <span>
                          {formatCurrency(invoiceDetail.taxAmount)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(invoiceDetail.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {invoiceDetail.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {invoiceDetail.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
            {invoiceDetail && (
              <Button
                onClick={() =>
                  window.open(
                    `/api/invoices/${invoiceDetail.id}/print`,
                    "_blank"
                  )
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Print PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${selectedInvoice?.invoiceNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
