"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

import { PageHeader } from "@/components/shared/page-header"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPayment } from "@/actions/payments"

type UnpaidInvoice = {
  id: string
  invoiceNumber: string
  client: {
    id: string
    name: string
    company: string | null
  }
  total: number
  totalPaid: number
  balance: number
  status: string
}

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function NewPaymentClient({ invoices }: { invoices: UnpaidInvoice[] }) {
  const router = useRouter()

  const [invoiceId, setInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId)

  const invoiceOptions = invoices.map((inv) => ({
    value: inv.id,
    label: `${inv.invoiceNumber} - ${inv.client.company || inv.client.name} (Balance: ${formatCurrency(inv.balance)})`,
  }))

  const handleInvoiceChange = (value: string) => {
    setInvoiceId(value)
    const inv = invoices.find((i) => i.id === value)
    if (inv) {
      setAmount(inv.balance.toFixed(2))
    }
  }

  const handleSave = async () => {
    if (!invoiceId) {
      toast.error("Please select an invoice")
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setSaving(true)
    try {
      await createPayment({
        invoiceId,
        amount: parseFloat(amount),
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        paymentDate,
      })
      toast.success("Payment recorded successfully")
      router.push("/accounts/payments")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Payment"
        description="Record a payment received against an invoice"
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invoice Selection */}
          <div className="grid gap-1.5">
            <Label>Invoice *</Label>
            <SearchableSelect
              options={invoiceOptions}
              value={invoiceId}
              onValueChange={handleInvoiceChange}
              placeholder="Select an invoice..."
              searchPlaceholder="Search invoices..."
            />
          </div>

          {/* Invoice Summary */}
          {selectedInvoice && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{selectedInvoice.client.company || selectedInvoice.client.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice Total</span>
                  <p className="font-medium">{formatCurrency(selectedInvoice.total)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Already Paid</span>
                  <p className="font-medium">{formatCurrency(selectedInvoice.totalPaid)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Balance Due</span>
                  <p className="font-semibold text-red-600">{formatCurrency(selectedInvoice.balance)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>Amount (AED) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedInvoice?.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Reference / Cheque Number</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. CHQ-12345 or TXN-67890"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={1}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => router.push("/accounts/payments")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !invoiceId || !amount}>
              {saving ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
