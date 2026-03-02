"use client"

import { useState } from "react"
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
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  updateInvoiceStatus,
  deleteInvoice,
  getInvoice,
} from "@/actions/invoices"

type Invoice = {
  id: string
  invoiceNumber: string
  invoiceType: string
  clientId: string
  subtotal: number
  discountTotal: number
  additionalCharges: number
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
    discount: number
    total: number
    sampleId: string | null
    reportId: string | null
    sample: { sampleNumber: string } | null
    report: { reportNumber: string } | null
  }>
}

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const statusBadge = (status: string, dueDate?: string | null) => {
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
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()

  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null)

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
      toast.success(`Invoice ${invoice.invoiceNumber} marked as ${status}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update invoice status")
    }
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

  const columns: ColumnDef<Invoice, any>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.invoiceNumber}</span>
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
      id: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const inv = row.original
        if (inv.status === "paid") {
          return (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              Paid {inv.paidDate ? format(new Date(inv.paidDate), "dd MMM") : ""}
            </Badge>
          )
        }
        if (inv.status === "cancelled") {
          return <span className="text-xs text-muted-foreground">-</span>
        }
        if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
          return (
            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
              Overdue
            </Badge>
          )
        }
        if (inv.status === "sent") {
          return (
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              Pending
            </Badge>
          )
        }
        return (
          <Badge variant="secondary">
            Unpaid
          </Badge>
        )
      },
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetail(invoice)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(`/api/invoices/${invoice.id}/print`, "_blank")}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print PDF</TooltipContent>
              </Tooltip>
              {invoice.status === "draft" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push(`/accounts/invoices/${invoice.id}/edit`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(invoice, "sent")}>
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(invoice, "paid")}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Paid</TooltipContent>
                </Tooltip>
              )}
              {(invoice.status === "draft" || invoice.status === "sent") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleStatusChange(invoice, "cancelled")}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setSelectedInvoice(invoice); setDeleteOpen(true) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices"
        description="Manage tax invoices for lab services"
        actionLabel="Create Invoice"
        actionHref="/accounts/invoices/new?type=tax"
      />

      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoices..."
        searchKey="invoiceNumber"
      />

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {invoiceDetail?.invoiceNumber}</DialogTitle>
            <DialogDescription>Invoice details and line items</DialogDescription>
          </DialogHeader>
          {invoiceDetail && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number</span>
                      <span className="font-medium">{invoiceDetail.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {statusBadge(invoiceDetail.status, invoiceDetail.dueDate)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(invoiceDetail.createdAt), "dd MMM yyyy")}</span>
                    </div>
                    {invoiceDetail.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>{format(new Date(invoiceDetail.dueDate), "dd MMM yyyy")}</span>
                      </div>
                    )}
                    {invoiceDetail.paidDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paid Date</span>
                        <span>{format(new Date(invoiceDetail.paidDate), "dd MMM yyyy")}</span>
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
                    <CardTitle className="text-sm font-medium text-muted-foreground">Bill To</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium">{invoiceDetail.client.company || invoiceDetail.client.name}</p>
                    {invoiceDetail.client.company && <p>{invoiceDetail.client.name}</p>}
                    {invoiceDetail.client.email && <p className="text-muted-foreground">{invoiceDetail.client.email}</p>}
                    {invoiceDetail.client.address && <p className="text-muted-foreground">{invoiceDetail.client.address}</p>}
                    {invoiceDetail.client.trn && <p className="text-muted-foreground">TRN: {invoiceDetail.client.trn}</p>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[5%]">#</TableHead>
                          <TableHead className="w-[37%]">Description</TableHead>
                          <TableHead className="w-[8%]">Qty</TableHead>
                          <TableHead className="w-[18%]">Unit Price</TableHead>
                          <TableHead className="w-[14%]">Discount</TableHead>
                          <TableHead className="w-[18%]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetail.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                {item.description}
                                {item.sample && <span className="ml-2 text-xs text-muted-foreground">({item.sample.sampleNumber})</span>}
                                {item.report && <span className="ml-1 text-xs text-muted-foreground">[{item.report.reportNumber}]</span>}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell>{item.discount > 0 ? formatCurrency(item.discount) : "-"}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(invoiceDetail.subtotal)}</span>
                      </div>
                      {invoiceDetail.discountTotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="text-red-600">-{formatCurrency(invoiceDetail.discountTotal)}</span>
                        </div>
                      )}
                      {invoiceDetail.additionalCharges > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Additional Charges</span>
                          <span>{formatCurrency(invoiceDetail.additionalCharges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({invoiceDetail.taxRate}%)</span>
                        <span>{formatCurrency(invoiceDetail.taxAmount)}</span>
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

              {invoiceDetail.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{invoiceDetail.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {invoiceDetail && (
              <Button onClick={() => window.open(`/api/invoices/${invoiceDetail.id}/print`, "_blank")}>
                <FileText className="mr-2 h-4 w-4" />
                Print PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
