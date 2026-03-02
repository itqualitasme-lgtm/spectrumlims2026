"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { verifyPayment, rejectPayment, getPayment } from "@/actions/payments"

type Payment = {
  id: string
  receiptNumber: string
  invoiceId: string
  amount: number
  paymentMethod: string
  referenceNumber: string | null
  chequeNumber: string | null
  bankName: string | null
  transactionId: string | null
  notes: string | null
  paymentDate: string
  verificationStatus: string
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

export function PaymentVerificationClient({ payments }: { payments: Payment[] }) {
  const router = useRouter()

  const [detailOpen, setDetailOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetail | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleVerify = async (payment: Payment) => {
    try {
      await verifyPayment(payment.id)
      toast.success(`Payment ${payment.receiptNumber} verified`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to verify payment")
    }
  }

  const handleOpenReject = (payment: Payment) => {
    setSelectedPayment(payment)
    setRejectReason("")
    setRejectOpen(true)
  }

  const handleReject = async () => {
    if (!selectedPayment) return
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }
    setLoading(true)
    try {
      await rejectPayment(selectedPayment.id, rejectReason)
      toast.success(`Payment ${selectedPayment.receiptNumber} rejected`)
      setRejectOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to reject payment")
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
      id: "reference",
      header: "Reference",
      cell: ({ row }) => {
        const p = row.original
        return p.referenceNumber || p.chequeNumber || p.transactionId || "-"
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      cell: ({ row }) =>
        format(new Date(row.original.paymentDate), "dd MMM yyyy"),
    },
    {
      accessorKey: "createdBy.name",
      header: "Recorded By",
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700" onClick={() => handleVerify(payment)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Verify Payment</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleOpenReject(payment)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reject Payment</TooltipContent>
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
        title="Payment Verification"
        description="Verify and audit payment records collected by receptionists"
      />

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending payments to verify. All payments have been processed.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          searchPlaceholder="Search payments..."
          searchKey="receiptNumber"
        />
      )}

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment {paymentDetail?.receiptNumber}</DialogTitle>
            <DialogDescription>Review payment details before verification</DialogDescription>
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
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">{formatCurrency(paymentDetail.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      {methodBadge(paymentDetail.paymentMethod)}
                    </div>
                    {paymentDetail.referenceNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ref. No.</span>
                        <span>{paymentDetail.referenceNumber}</span>
                      </div>
                    )}
                    {paymentDetail.chequeNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cheque No.</span>
                        <span>{paymentDetail.chequeNumber}</span>
                      </div>
                    )}
                    {paymentDetail.bankName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank</span>
                        <span>{paymentDetail.bankName}</span>
                      </div>
                    )}
                    {paymentDetail.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Txn ID</span>
                        <span>{paymentDetail.transactionId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{format(new Date(paymentDetail.paymentDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recorded By</span>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {paymentDetail && (
              <>
                <Button variant="destructive" onClick={() => { setDetailOpen(false); handleOpenReject(paymentDetail as any) }}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { handleVerify(paymentDetail as any); setDetailOpen(false) }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Reject payment {selectedPayment?.receiptNumber} of {selectedPayment ? formatCurrency(selectedPayment.amount) : ""}. This will revert the invoice payment status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-1.5">
              <Label>Reason for Rejection *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this payment is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading || !rejectReason.trim()}>
              {loading ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
