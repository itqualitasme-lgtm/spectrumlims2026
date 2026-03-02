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

  // Cheque fields
  const [chequeNumber, setChequeNumber] = useState("")
  const [chequeDate, setChequeDate] = useState("")
  const [chequeBankName, setChequeBankName] = useState("")

  // Bank transfer fields
  const [bankName, setBankName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [transactionId, setTransactionId] = useState("")

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
        chequeNumber: paymentMethod === "cheque" ? chequeNumber || undefined : undefined,
        chequeDate: paymentMethod === "cheque" && chequeDate ? chequeDate : undefined,
        bankName: paymentMethod === "cheque" ? chequeBankName || undefined : paymentMethod === "bank_transfer" ? bankName || undefined : undefined,
        bankAccountNumber: paymentMethod === "bank_transfer" ? bankAccountNumber || undefined : undefined,
        transactionId: paymentMethod === "bank_transfer" ? transactionId || undefined : undefined,
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

          {/* Core Payment Fields */}
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

          {/* Receipt Book Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Receipt Book Reference No.</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Manual receipt book number (optional)"
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

          {/* Cheque Details */}
          {paymentMethod === "cheque" && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="text-sm font-medium">Cheque Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label>Cheque Number</Label>
                  <Input
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="e.g. 000456"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Cheque Date</Label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    value={chequeBankName}
                    onChange={(e) => setChequeBankName(e.target.value)}
                    placeholder="e.g. Emirates NBD"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Details */}
          {paymentMethod === "bank_transfer" && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="text-sm font-medium">Bank Transfer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1.5">
                  <Label>Bank Name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Emirates NBD"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Account Number</Label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Transaction ID</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN-2026-001"
                  />
                </div>
              </div>
            </div>
          )}

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
