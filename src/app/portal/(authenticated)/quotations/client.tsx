"use client"

import { useState } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, Printer } from "lucide-react"

type QuotationItem = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  sampleId: string | null
}

type Quotation = {
  id: string
  quotationNumber: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  validUntil: string | null
  notes: string | null
  createdAt: string
  items: QuotationItem[]
}

function formatDate(date: string) {
  return format(new Date(date), "dd MMM yyyy")
}

function formatCurrency(amount: number) {
  return `AED ${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getQuotationStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>
    case "sent":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>
    case "accepted":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
    case "expired":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Expired</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function PortalQuotationsClient({ quotations }: { quotations: Quotation[] }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)

  function openDetail(quotation: Quotation) {
    setSelectedQuotation(quotation)
    setDetailOpen(true)
  }

  const columns: ColumnDef<Quotation, any>[] = [
    {
      accessorKey: "quotationNumber",
      header: "Quotation #",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() => openDetail(row.original)}
        >
          {row.original.quotationNumber}
        </Button>
      ),
    },
    {
      id: "itemsCount",
      header: "Items",
      cell: ({ row }) => row.original.items.length,
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
        <span className="font-medium">{formatCurrency(row.original.total)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getQuotationStatusBadge(row.original.status),
    },
    {
      accessorKey: "validUntil",
      header: "Valid Until",
      cell: ({ row }) =>
        row.original.validUntil ? formatDate(row.original.validUntil) : "-",
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetail(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              window.open(`/api/quotations/${row.original.id}/print`, "_blank")
            }
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Quotations"
        description="View all your quotations and their status"
      />

      <DataTable
        columns={columns}
        data={quotations}
        searchPlaceholder="Search quotations..."
        searchKey="quotationNumber"
      />

      {/* Quotation Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Quotation {selectedQuotation?.quotationNumber}</span>
              {selectedQuotation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/api/quotations/${selectedQuotation.id}/print`,
                      "_blank"
                    )
                  }
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedQuotation && (
            <div className="space-y-4">
              {/* Quotation Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quotation Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quotation #:</span>
                      <span className="ml-2 font-medium">
                        {selectedQuotation.quotationNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2">
                        {getQuotationStatusBadge(selectedQuotation.status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2">
                        {formatDate(selectedQuotation.createdAt)}
                      </span>
                    </div>
                    {selectedQuotation.validUntil && (
                      <div>
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span className="ml-2">
                          {formatDate(selectedQuotation.validUntil)}
                        </span>
                      </div>
                    )}
                    {selectedQuotation.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <span className="ml-2">{selectedQuotation.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-3">Items</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedQuotation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(selectedQuotation.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tax ({selectedQuotation.taxRate}%):
                    </span>
                    <span>{formatCurrency(selectedQuotation.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedQuotation.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
