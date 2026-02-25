"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Play,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  FileText,
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
  createContract,
  updateContractStatus,
  deleteContract,
  getCustomersForContract,
  getSamplesForContract,
  getContract,
} from "@/actions/contracts"

type Contract = {
  id: string
  contractNumber: string
  clientId: string
  quotationId: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  startDate: string | null
  endDate: string | null
  terms: string | null
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
  quotation: { quotationNumber: string } | null
  _count: { items: number }
}

type ContractDetail = Contract & {
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
    case "active":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Active
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Completed
        </Badge>
      )
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Cancelled
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function ContractsClient({ contracts }: { contracts: Contract[] }) {
  const router = useRouter()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [contractDetail, setContractDetail] = useState<ContractDetail | null>(null)

  const [clientId, setClientId] = useState("")
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [samples, setSamples] = useState<{ value: string; label: string }[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, sampleId: "" },
  ])
  const [taxRate, setTaxRate] = useState(5)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [terms, setTerms] = useState("")
  const [notes, setNotes] = useState("")

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [lineItems]
  )
  const taxAmount = useMemo(() => subtotal * taxRate / 100, [subtotal, taxRate])
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  const handleOpenCreate = async () => {
    try {
      const custs = await getCustomersForContract()
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
      setStartDate("")
      setEndDate("")
      setTerms("")
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
        const smpls = await getSamplesForContract(value)
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
      const contract = await createContract({
        clientId,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sampleId: item.sampleId || undefined,
        })),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
        taxRate,
      })
      toast.success(`Contract ${contract.contractNumber} created successfully`)
      setCreateOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create contract")
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (contract: Contract) => {
    try {
      const detail = await getContract(contract.id)
      if (!detail) {
        toast.error("Contract not found")
        return
      }
      setContractDetail(JSON.parse(JSON.stringify(detail)))
      setDetailOpen(true)
    } catch {
      toast.error("Failed to load contract details")
    }
  }

  const handleStatusChange = async (contract: Contract, status: string) => {
    try {
      await updateContractStatus(contract.id, status)
      toast.success(
        `Contract ${contract.contractNumber} marked as ${status}`
      )
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update contract status")
    }
  }

  const handleDelete = async () => {
    if (!selectedContract) return

    setLoading(true)
    try {
      await deleteContract(selectedContract.id)
      toast.success(`Contract ${selectedContract.contractNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contract")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Contract, any>[] = [
    {
      accessorKey: "contractNumber",
      header: "Contract #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.contractNumber}</span>
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.client.company || row.original.client.name,
    },
    {
      id: "quotation",
      header: "Quotation",
      cell: ({ row }) =>
        row.original.quotation?.quotationNumber || "-",
    },
    {
      id: "itemsCount",
      header: "Items",
      cell: ({ row }) => row.original._count.items,
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
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) =>
        row.original.startDate
          ? format(new Date(row.original.startDate), "dd MMM yyyy")
          : "-",
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) =>
        row.original.endDate
          ? format(new Date(row.original.endDate), "dd MMM yyyy")
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
        const contract = row.original
        return (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleViewDetail(contract)}
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
                      window.open(`/api/contracts/${contract.id}/print`, "_blank")
                    }
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print PDF</TooltipContent>
              </Tooltip>
              {contract.status === "draft" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleStatusChange(contract, "active")}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Activate</TooltipContent>
                </Tooltip>
              )}
              {contract.status === "active" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStatusChange(contract, "completed")}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as Completed</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleStatusChange(contract, "cancelled")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel</TooltipContent>
                  </Tooltip>
                </>
              )}
              {contract.status === "draft" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedContract(contract)
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
        title="Contracts"
        description="Create and manage service contracts with customers"
        actionLabel="Create Contract"
        onAction={handleOpenCreate}
      />

      <DataTable
        columns={columns}
        data={contracts}
        searchPlaceholder="Search contracts..."
        searchKey="contractNumber"
      />

      {/* Create Contract Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Contract</DialogTitle>
            <DialogDescription>
              Create a new service contract for a customer.
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

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
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
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Terms and conditions..."
                    rows={3}
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
                "Create Contract"
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
              Contract {contractDetail?.contractNumber}
            </DialogTitle>
            <DialogDescription>
              Contract details and line items
            </DialogDescription>
          </DialogHeader>
          {contractDetail && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contract Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number</span>
                      <span className="font-medium">
                        {contractDetail.contractNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {statusBadge(contractDetail.status)}
                    </div>
                    {contractDetail.quotation && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From Quotation</span>
                        <span>{contractDetail.quotation.quotationNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>
                        {format(
                          new Date(contractDetail.createdAt),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                    {contractDetail.startDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date</span>
                        <span>
                          {format(
                            new Date(contractDetail.startDate),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    {contractDetail.endDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">End Date</span>
                        <span>
                          {format(
                            new Date(contractDetail.endDate),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created By</span>
                      <span>{contractDetail.createdBy.name}</span>
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
                      {contractDetail.client.company ||
                        contractDetail.client.name}
                    </p>
                    {contractDetail.client.company && (
                      <p>{contractDetail.client.name}</p>
                    )}
                    {contractDetail.client.email && (
                      <p className="text-muted-foreground">
                        {contractDetail.client.email}
                      </p>
                    )}
                    {contractDetail.client.address && (
                      <p className="text-muted-foreground">
                        {contractDetail.client.address}
                      </p>
                    )}
                    {contractDetail.client.trn && (
                      <p className="text-muted-foreground">
                        TRN: {contractDetail.client.trn}
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
                        {contractDetail.items.map((item, index) => (
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

                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(contractDetail.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax ({contractDetail.taxRate}%)
                        </span>
                        <span>
                          {formatCurrency(contractDetail.taxAmount)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(contractDetail.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms */}
              {contractDetail.terms && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Terms & Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {contractDetail.terms}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {contractDetail.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {contractDetail.notes}
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
            {contractDetail && (
              <Button
                onClick={() =>
                  window.open(
                    `/api/contracts/${contractDetail.id}/print`,
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
        title="Delete Contract"
        description={`Are you sure you want to delete contract ${selectedContract?.contractNumber}? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
