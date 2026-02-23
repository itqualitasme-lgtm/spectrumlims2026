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
  quotationTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  quotationInfoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  quotationInfoLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    width: 80,
    textAlign: "right",
    marginRight: 8,
  },
  quotationInfoValue: {
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
    case "accepted":
      return { backgroundColor: "#dcfce7", color: "#166534" }
    case "sent":
      return { backgroundColor: "#dbeafe", color: "#1e40af" }
    case "rejected":
      return { backgroundColor: "#fee2e2", color: "#991b1b" }
    case "expired":
      return { backgroundColor: "#f3f4f6", color: "#374151" }
    case "draft":
      return { backgroundColor: "#f3f4f6", color: "#374151" }
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" }
  }
}

interface QuotationPDFProps {
  quotation: {
    quotationNumber: string
    status: string
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    validUntil: string | Date | null
    acceptedDate: string | Date | null
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

export function QuotationPDF({ quotation }: QuotationPDFProps) {
  const statusStyle = getStatusStyle(quotation.status)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labName}>
              {quotation.lab.name || "Spectrum Testing & Inspection"}
            </Text>
            {quotation.lab.address && (
              <Text style={styles.labDetail}>{quotation.lab.address}</Text>
            )}
            {quotation.lab.phone && (
              <Text style={styles.labDetail}>Tel: {quotation.lab.phone}</Text>
            )}
            {quotation.lab.email && (
              <Text style={styles.labDetail}>
                Email: {quotation.lab.email}
              </Text>
            )}
            {quotation.lab.trn && (
              <Text style={styles.labDetail}>TRN: {quotation.lab.trn}</Text>
            )}
          </View>
          <View>
            <Text style={styles.quotationTitle}>QUOTATION</Text>
            <View style={styles.quotationInfoRow}>
              <Text style={styles.quotationInfoLabel}>Quotation No:</Text>
              <Text style={styles.quotationInfoValue}>
                {quotation.quotationNumber}
              </Text>
            </View>
            <View style={styles.quotationInfoRow}>
              <Text style={styles.quotationInfoLabel}>Date:</Text>
              <Text style={styles.quotationInfoValue}>
                {format(new Date(quotation.createdAt), "dd MMM yyyy")}
              </Text>
            </View>
            {quotation.validUntil && (
              <View style={styles.quotationInfoRow}>
                <Text style={styles.quotationInfoLabel}>Valid Until:</Text>
                <Text style={styles.quotationInfoValue}>
                  {format(new Date(quotation.validUntil), "dd MMM yyyy")}
                </Text>
              </View>
            )}
            <View style={styles.quotationInfoRow}>
              <Text style={styles.quotationInfoLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusStyle.backgroundColor,
                    color: statusStyle.color,
                  },
                ]}
              >
                {quotation.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        <View style={styles.billTo}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.billToName}>
            {quotation.client.company || quotation.client.name}
          </Text>
          {quotation.client.company && (
            <Text style={styles.billToDetail}>{quotation.client.name}</Text>
          )}
          {quotation.client.address && (
            <Text style={styles.billToDetail}>{quotation.client.address}</Text>
          )}
          {quotation.client.email && (
            <Text style={styles.billToDetail}>{quotation.client.email}</Text>
          )}
          {quotation.client.trn && (
            <Text style={styles.billToDetail}>TRN: {quotation.client.trn}</Text>
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
          {quotation.items.map((item, index) => (
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
                {formatCurrency(quotation.subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tax ({quotation.taxRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(quotation.taxAmount)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(quotation.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {quotation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This quotation is valid for the period specified above.
          </Text>
          <Text style={styles.footerText}>
            Please contact us if you have any questions regarding this quotation.
          </Text>
          <Text style={styles.footerText}>
            {quotation.lab.name || "Spectrum Testing & Inspection"}
            {quotation.lab.phone ? ` | Tel: ${quotation.lab.phone}` : ""}
            {quotation.lab.email ? ` | ${quotation.lab.email}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateQuotationPDF(quotation: QuotationPDFProps["quotation"]) {
  const buffer = await renderToBuffer(<QuotationPDF quotation={quotation} />)
  return buffer
}
