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
  FileText,
  FileSignature,
  Loader2,
  Plus,
  X,
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

import {
  createQuotation,
  updateQuotationStatus,
  deleteQuotation,
  getCustomersForQuotation,
  getSamplesForQuotation,
  getQuotation,
} from "@/actions/quotations"
import { convertQuotationToContract } from "@/actions/contracts"

type Quotation = {
  id: string
  quotationNumber: string
  clientId: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  validUntil: string | null
  acceptedDate: string | null
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

type QuotationDetail = Quotation & {
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

const statusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "sent":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Sent
        </Badge>
      )
    case "accepted":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Accepted
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Rejected
        </Badge>
      )
    case "expired":
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          Expired
        </Badge>
      )
    case "converted":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Converted
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function QuotationsClient({ quotations }: { quotations: Quotation[] }) {
  const router = useRouter()

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Selected quotation for actions
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [quotationDetail, setQuotationDetail] = useState<QuotationDetail | null>(null)

  // Create form state
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
  const [validUntil, setValidUntil] = useState("")
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
      const custs = await getCustomersForQuotation()
      setCustomers(
        custs.map((c) => ({
          value: c.id,
          label: c.company ? `${c.company} (${c.name})` : c.name,
        }))
      )
      setClientId("")
      setSamples([])
      setLineItems([{ description: "", quantity: 1, unitPrice: 0, sampleId: "" }])
      setTaxRate(5)
      setValidUntil("")
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
        const smpls = await getSamplesForQuotation(value)
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
      const quotation = await createQuotation({
        clientId,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sampleId: item.sampleId || undefined,
        })),
        validUntil: validUntil || undefined,
        notes: notes.trim() || undefined,
        taxRate,
      })
      toast.success(`Quotation ${quotation.quotationNumber} created successfully`)
      setCreateOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create quotation")
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (quotation: Quotation) => {
    try {
      const detail = await getQuotation(quotation.id)
      if (!detail) {
        toast.error("Quotation not found")
        return
      }
      setQuotationDetail(JSON.parse(JSON.stringify(detail)))
      setDetailOpen(true)
    } catch {
      toast.error("Failed to load quotation details")
    }
  }

  const handleStatusChange = async (quotation: Quotation, status: string) => {
    try {
      await updateQuotationStatus(quotation.id, status)
      toast.success(
        `Quotation ${quotation.quotationNumber} marked as ${status}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update quotation status")
    }
  }

  const handleConvertToContract = async (quotation: Quotation) => {
    try {
      const contract = await convertQuotationToContract(quotation.id)
      toast.success(
        `Converted to contract ${contract.contractNumber}`,
        {
          action: {
            label: "View Contract",
            onClick: () => router.push("/accounts/contracts"),
          },
        }
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to convert quotation to contract")
    }
  }

  const handleDelete = async () => {
    if (!selectedQuotation) return

    setLoading(true)
    try {
      await deleteQuotation(selectedQuotation.id)
      toast.success(`Quotation ${selectedQuotation.quotationNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete quotation")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Quotation, any>[] = [
    {
      accessorKey: "quotationNumber",
      header: "Quotation #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.quotationNumber}</span>
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
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: "validUntil",
      header: "Valid Until",
      cell: ({ row }) =>
        row.original.validUntil
          ? format(new Date(row.original.validUntil), "dd MMM yyyy")
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
        const quotation = row.original
        return (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleViewDetail(quotation)}
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
                      window.open(`/api/quotations/${quotation.id}/print`, "_blank")
                    }
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print PDF</TooltipContent>
              </Tooltip>
              {quotation.status === "draft" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStatusChange(quotation, "sent")}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Sent</TooltipContent>
                </Tooltip>
              )}
              {quotation.status === "sent" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStatusChange(quotation, "accepted")}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as Accepted</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStatusChange(quotation, "rejected")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as Rejected</TooltipContent>
                  </Tooltip>
                </>
              )}
              {quotation.status === "accepted" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleConvertToContract(quotation)}
                    >
                      <FileSignature className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Convert to Contract</TooltipContent>
                </Tooltip>
              )}
              {quotation.status === "draft" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedQuotation(quotation)
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
        title="Quotations"
        description="Create and manage quotations for lab services"
        actionLabel="Create Quotation"
        onAction={handleOpenCreate}
      />

      <DataTable
        columns={columns}
        data={quotations}
        searchPlaceholder="Search quotations..."
        searchKey="quotationNumber"
      />

      {/* Create Quotation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Quotation</DialogTitle>
            <DialogDescription>
              Create a new quotation for a customer.
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
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
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
                "Create Quotation"
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
              Quotation {quotationDetail?.quotationNumber}
            </DialogTitle>
            <DialogDescription>
              Quotation details and line items
            </DialogDescription>
          </DialogHeader>
          {quotationDetail && (
            <div className="space-y-6 py-4">
              {/* Quotation Info */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Quotation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number</span>
                      <span className="font-medium">
                        {quotationDetail.quotationNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {statusBadge(quotationDetail.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>
                        {format(
                          new Date(quotationDetail.createdAt),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                    {quotationDetail.validUntil && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until</span>
                        <span>
                          {format(
                            new Date(quotationDetail.validUntil),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    {quotationDetail.acceptedDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accepted Date</span>
                        <span>
                          {format(
                            new Date(quotationDetail.acceptedDate),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created By</span>
                      <span>{quotationDetail.createdBy.name}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium">
                      {quotationDetail.client.company ||
                        quotationDetail.client.name}
                    </p>
                    {quotationDetail.client.company && (
                      <p>{quotationDetail.client.name}</p>
                    )}
                    {quotationDetail.client.email && (
                      <p className="text-muted-foreground">
                        {quotationDetail.client.email}
                      </p>
                    )}
                    {quotationDetail.client.address && (
                      <p className="text-muted-foreground">
                        {quotationDetail.client.address}
                      </p>
                    )}
                    {quotationDetail.client.trn && (
                      <p className="text-muted-foreground">
                        TRN: {quotationDetail.client.trn}
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
                        {quotationDetail.items.map((item, index) => (
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
                        <span>{formatCurrency(quotationDetail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax ({quotationDetail.taxRate}%)
                        </span>
                        <span>
                          {formatCurrency(quotationDetail.taxAmount)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(quotationDetail.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {quotationDetail.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {quotationDetail.notes}
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
            {quotationDetail && (
              <Button
                onClick={() =>
                  window.open(
                    `/api/quotations/${quotationDetail.id}/print`,
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
        title="Delete Quotation"
        description={`Are you sure you want to delete quotation ${selectedQuotation?.quotationNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
