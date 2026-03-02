import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import { format } from "date-fns"

const NAVY = "#1e3a5f"
const BORDER_COLOR = "#d1d5db"
const TEXT_MUTED = "#6b7280"
const GREEN = "#16a34a"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  headerLeft: {
    width: "50%",
  },
  headerRight: {
    width: "45%",
    alignItems: "flex-end",
  },
  labName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  labDetail: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  receiptTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginVertical: 15,
  },
  // Info section
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBlock: {
    width: "48%",
  },
  infoTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    width: 110,
    fontSize: 9,
    color: TEXT_MUTED,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  // Amount box
  amountBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 4,
    padding: 20,
    alignItems: "center",
    marginVertical: 20,
  },
  amountLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
  },
  amountWords: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  // Method badge
  methodRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    gap: 20,
  },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginRight: 4,
  },
  methodValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  // Invoice details
  invoiceSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    padding: 12,
  },
  invoiceSectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  invoiceLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  invoiceValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  // Notes
  notesSection: {
    marginTop: 15,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
  },
  footerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  // Signatures
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 50,
  },
  signatureBlock: {
    width: "40%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
})

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const methodLabel = (method: string) => {
  switch (method) {
    case "cash": return "Cash"
    case "cheque": return "Cheque"
    case "bank_transfer": return "Bank Transfer"
    default: return method
  }
}

interface PaymentReceiptProps {
  receiptNumber: string
  amount: number
  paymentMethod: string
  referenceNumber?: string | null
  notes?: string | null
  paymentDate: Date | string
  createdBy: { name: string }
  invoice: {
    invoiceNumber: string
    total: number
    status: string
    client: {
      name: string
      company?: string | null
      address?: string | null
      trn?: string | null
    }
  }
  lab: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    trn?: string | null
  }
  totalPaidOnInvoice: number
}

function PaymentReceiptPDF(props: PaymentReceiptProps) {
  const { lab, invoice, totalPaidOnInvoice } = props
  const clientName = invoice.client.company || invoice.client.name
  const balance = invoice.total - totalPaidOnInvoice
  const paymentDateFormatted = format(
    typeof props.paymentDate === "string" ? new Date(props.paymentDate) : props.paymentDate,
    "dd MMM yyyy"
  )

  return (
    <Document
      title={`Receipt ${props.receiptNumber}`}
      author={lab.name}
      subject="Payment Receipt"
      creator="Spectrum LIMS"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labName}>{lab.name}</Text>
            {lab.address && <Text style={styles.labDetail}>{lab.address}</Text>}
            {lab.phone && <Text style={styles.labDetail}>Tel: {lab.phone}</Text>}
            {lab.email && <Text style={styles.labDetail}>{lab.email}</Text>}
            {lab.trn && <Text style={styles.labDetail}>TRN: {lab.trn}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
            <Text style={styles.receiptNumber}>{props.receiptNumber}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Received From</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>{clientName}</Text>
            </View>
            {invoice.client.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={[styles.infoValue, { fontFamily: "Helvetica" }]}>{invoice.client.address}</Text>
              </View>
            )}
            {invoice.client.trn && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>TRN</Text>
                <Text style={styles.infoValue}>{invoice.client.trn}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Payment Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{paymentDateFormatted}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Method</Text>
              <Text style={styles.infoValue}>{methodLabel(props.paymentMethod)}</Text>
            </View>
            {props.referenceNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reference No.</Text>
                <Text style={styles.infoValue}>{props.referenceNumber}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Received By</Text>
              <Text style={styles.infoValue}>{props.createdBy.name}</Text>
            </View>
          </View>
        </View>

        {/* Amount Box */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Received</Text>
          <Text style={styles.amountValue}>{formatCurrency(props.amount)}</Text>
        </View>

        {/* Invoice Summary */}
        <View style={styles.invoiceSection}>
          <Text style={styles.invoiceSectionTitle}>Against Invoice</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Invoice Number</Text>
            <Text style={styles.invoiceValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Invoice Total</Text>
            <Text style={styles.invoiceValue}>{formatCurrency(invoice.total)}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Total Paid</Text>
            <Text style={styles.invoiceValue}>{formatCurrency(totalPaidOnInvoice)}</Text>
          </View>
          <View style={[styles.invoiceRow, { borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 4, marginTop: 4 }]}>
            <Text style={[styles.invoiceLabel, { fontFamily: "Helvetica-Bold" }]}>Balance Due</Text>
            <Text style={[styles.invoiceValue, { color: balance <= 0.01 ? GREEN : "#dc2626" }]}>
              {balance <= 0.01 ? "FULLY PAID" : formatCurrency(balance)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {props.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{props.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Received By</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Client Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            This is a computer-generated receipt. | {lab.name} | {lab.phone || ""} | {lab.email || ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generatePaymentReceiptPDF(props: PaymentReceiptProps): Promise<Buffer> {
  const buffer = await renderToBuffer(<PaymentReceiptPDF {...props} />)
  return buffer as Buffer
}
