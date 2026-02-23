import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer"
import { format } from "date-fns"

const NAVY = "#1e3a5f"
const LIGHT_BLUE = "#f0f4f8"
const BORDER_COLOR = "#d1d5db"
const TEXT_MUTED = "#6b7280"

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
    flex: 1,
  },
  labName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
  },
  labDetail: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  invoiceInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  invoiceInfoLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    width: 80,
    textAlign: "right",
    marginRight: 8,
  },
  invoiceInfoValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    width: 100,
    textAlign: "right",
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    marginBottom: 20,
  },
  billTo: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: LIGHT_BLUE,
    borderRadius: 4,
  },
  billToTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billToName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  billToDetail: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginBottom: 1,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    fontSize: 9,
  },
  colNum: {
    width: "6%",
  },
  colDesc: {
    width: "44%",
  },
  colQty: {
    width: "12%",
    textAlign: "center",
  },
  colPrice: {
    width: "19%",
    textAlign: "right",
  },
  colTotal: {
    width: "19%",
    textAlign: "right",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  summaryBox: {
    width: 220,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 9,
  },
  summaryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginVertical: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: NAVY,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  totalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  notesSection: {
    marginBottom: 30,
    padding: 12,
    backgroundColor: LIGHT_BLUE,
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 2,
  },
  statusBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
})

const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "paid":
      return { backgroundColor: "#dcfce7", color: "#166534" }
    case "sent":
      return { backgroundColor: "#dbeafe", color: "#1e40af" }
    case "overdue":
      return { backgroundColor: "#fee2e2", color: "#991b1b" }
    case "cancelled":
      return { backgroundColor: "#f3f4f6", color: "#374151" }
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" }
  }
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string
    status: string
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    dueDate: string | Date | null
    paidDate: string | Date | null
    notes: string | null
    createdAt: string | Date
    client: {
      name: string
      company: string | null
      email: string | null
      address: string | null
      trn: string | null
    }
    createdBy: { name: string }
    lab: {
      name: string
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
      sample: { sampleNumber: string } | null
    }>
  }
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const statusStyle = getStatusStyle(invoice.status)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labName}>
              {invoice.lab.name || "Spectrum Testing & Inspection"}
            </Text>
            {invoice.lab.address && (
              <Text style={styles.labDetail}>{invoice.lab.address}</Text>
            )}
            {invoice.lab.phone && (
              <Text style={styles.labDetail}>Tel: {invoice.lab.phone}</Text>
            )}
            {invoice.lab.email && (
              <Text style={styles.labDetail}>
                Email: {invoice.lab.email}
              </Text>
            )}
            {invoice.lab.trn && (
              <Text style={styles.labDetail}>TRN: {invoice.lab.trn}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Invoice No:</Text>
              <Text style={styles.invoiceInfoValue}>
                {invoice.invoiceNumber}
              </Text>
            </View>
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Date:</Text>
              <Text style={styles.invoiceInfoValue}>
                {format(new Date(invoice.createdAt), "dd MMM yyyy")}
              </Text>
            </View>
            {invoice.dueDate && (
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>Due Date:</Text>
                <Text style={styles.invoiceInfoValue}>
                  {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                </Text>
              </View>
            )}
            <View style={styles.invoiceInfoRow}>
              <Text style={styles.invoiceInfoLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusStyle.backgroundColor,
                    color: statusStyle.color,
                  },
                ]}
              >
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.billToName}>
            {invoice.client.company || invoice.client.name}
          </Text>
          {invoice.client.company && (
            <Text style={styles.billToDetail}>{invoice.client.name}</Text>
          )}
          {invoice.client.address && (
            <Text style={styles.billToDetail}>{invoice.client.address}</Text>
          )}
          {invoice.client.email && (
            <Text style={styles.billToDetail}>{invoice.client.email}</Text>
          )}
          {invoice.client.trn && (
            <Text style={styles.billToDetail}>TRN: {invoice.client.trn}</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              Total
            </Text>
          </View>
          {invoice.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.colNum]}>
                {index + 1}
              </Text>
              <Text style={[styles.tableCell, styles.colDesc]}>
                {item.description}
                {item.sample ? ` (${item.sample.sampleNumber})` : ""}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(invoice.subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tax ({invoice.taxRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(invoice.taxAmount)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Payment is due within 30 days of the invoice date unless otherwise
            stated.
          </Text>
          <Text style={styles.footerText}>
            Please include the invoice number on your payment for reference.
          </Text>
          <Text style={styles.footerText}>
            {invoice.lab.name || "Spectrum Testing & Inspection"}
            {invoice.lab.phone ? ` | Tel: ${invoice.lab.phone}` : ""}
            {invoice.lab.email ? ` | ${invoice.lab.email}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(invoice: InvoicePDFProps["invoice"]) {
  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />)
  return buffer
}
