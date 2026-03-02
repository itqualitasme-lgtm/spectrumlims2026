"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Eye,
  FileText,
  Trash2,
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
import { deletePayment, getPayment } from "@/actions/payments"

type Payment = {
  id: string
  receiptNumber: string
  invoiceId: string
  amount: number
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  paymentDate: string
  createdAt: string
  invoice: {
    invoiceNumber: string
    invoiceType: string
    total: number
    status: string
    client: {
      id: string
      name: string
      company: string | null
    }
  }
  createdBy: { name: string }
}

type PaymentDetail = Payment & {
  lab: {
    id: string
    name: string
    code: string
    address: string | null
    phone: string | null
    email: string | null
    trn: string | null
  }
  invoice: Payment["invoice"] & {
    client: {
      id: string
      name: string
      company: string | null
      email: string | null
      address: string | null
      trn: string | null
    }
    items: Array<{
      id: string
      description: string
      quantity: number
      unitPrice: number
      discount: number
      total: number
    }>
  }
}

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const methodBadge = (method: string) => {
  switch (method) {
    case "cash":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Cash</Badge>
    case "cheque":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Cheque</Badge>
    case "bank_transfer":
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Bank Transfer</Badge>
    default:
      return <Badge variant="secondary">{method}</Badge>
  }
}

export function PaymentsClient({ payments }: { payments: Payment[] }) {
  const router = useRouter()

  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(null)

  const handleViewDetail = async (payment: Payment) => {
    try {
      const detail = await getPayment(payment.id)
      if (!detail) {
        toast.error("Payment not found")
        return
      }
      setPaymentDetail(JSON.parse(JSON.stringify(detail)))
      setDetailOpen(true)
    } catch {
      toast.error("Failed to load payment details")
    }
  }

  const handleDelete = async () => {
    if (!selectedPayment) return
    setLoading(true)
    try {
      await deletePayment(selectedPayment.id)
      toast.success(`Payment ${selectedPayment.receiptNumber} deleted`)
      setDeleteOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete payment")
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<Payment, any>[] = [
    {
      accessorKey: "receiptNumber",
      header: "Receipt #",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.receiptNumber}</span>
      ),
    },
    {
      id: "invoice",
      header: "Invoice #",
      cell: ({ row }) => row.original.invoice.invoiceNumber,
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) =>
        row.original.invoice.client.company || row.original.invoice.client.name,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => methodBadge(row.original.paymentMethod),
    },
    {
      accessorKey: "referenceNumber",
      header: "Reference",
      cell: ({ row }) => row.original.referenceNumber || "-",
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) =>
        format(new Date(row.original.paymentDate), "dd MMM yyyy"),
    },
    {
      accessorKey: "createdBy.name",
      header: "Received By",
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const payment = row.original
        return (
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewDetail(payment)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(`/api/payments/${payment.id}/print`, "_blank")}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print Receipt</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setSelectedPayment(payment); setDeleteOpen(true) }}>
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
        title="Payments Received"
        description="Record and manage payment receipts"
        actionLabel="Record Payment"
        actionHref="/accounts/payments/new"
      />

      <DataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Search payments..."
        searchKey="receiptNumber"
      />

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt {paymentDetail?.receiptNumber}</DialogTitle>
            <DialogDescription>Payment details</DialogDescription>
          </DialogHeader>
          {paymentDetail && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Payment Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receipt #</span>
                      <span className="font-medium">{paymentDetail.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">{formatCurrency(paymentDetail.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      {methodBadge(paymentDetail.paymentMethod)}
                    </div>
                    {paymentDetail.referenceNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference</span>
                        <span>{paymentDetail.referenceNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(paymentDetail.paymentDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Received By</span>
                      <span>{paymentDetail.createdBy.name}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice #</span>
                      <span className="font-medium">{paymentDetail.invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client</span>
                      <span>{paymentDetail.invoice.client.company || paymentDetail.invoice.client.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice Total</span>
                      <span>{formatCurrency(paymentDetail.invoice.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={paymentDetail.invoice.status === "paid" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>
                        {paymentDetail.invoice.status === "paid" ? "Paid" : "Partial"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {paymentDetail.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{paymentDetail.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {paymentDetail && (
              <Button onClick={() => window.open(`/api/payments/${paymentDetail.id}/print`, "_blank")}>
                <FileText className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Payment"
        description={`Are you sure you want to delete payment ${selectedPayment?.receiptNumber}? This will revert the invoice payment status.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
        loading={loading}
      />
    </div>
  )
}
