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
  contractTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    width: 80,
    textAlign: "right",
    marginRight: 8,
  },
  infoValue: {
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
  clientSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: LIGHT_BLUE,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  clientName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  clientDetail: {
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
  colNum: { width: "6%" },
  colDesc: { width: "44%" },
  colQty: { width: "12%", textAlign: "center" as const },
  colPrice: { width: "19%", textAlign: "right" as const },
  colTotal: { width: "19%", textAlign: "right" as const },
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
  termsSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: LIGHT_BLUE,
    borderRadius: 4,
  },
  termsText: {
    fontSize: 9,
    color: TEXT_MUTED,
    lineHeight: 1.5,
  },
  notesSection: {
    marginBottom: 30,
    padding: 12,
    backgroundColor: LIGHT_BLUE,
    borderRadius: 4,
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
    case "active":
      return { backgroundColor: "#dbeafe", color: "#1e40af" }
    case "completed":
      return { backgroundColor: "#dcfce7", color: "#166534" }
    case "cancelled":
      return { backgroundColor: "#fee2e2", color: "#991b1b" }
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" }
  }
}

interface ContractPDFProps {
  contract: {
    contractNumber: string
    status: string
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
    startDate: string | Date | null
    endDate: string | Date | null
    terms: string | null
    notes: string | null
    createdAt: string | Date
    quotation: { quotationNumber: string } | null
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

function ContractPDF({ contract }: ContractPDFProps) {
  const statusStyle = getStatusStyle(contract.status)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labName}>
              {contract.lab.name || "Spectrum Testing & Inspection"}
            </Text>
            {contract.lab.address && (
              <Text style={styles.labDetail}>{contract.lab.address}</Text>
            )}
            {contract.lab.phone && (
              <Text style={styles.labDetail}>Tel: {contract.lab.phone}</Text>
            )}
            {contract.lab.email && (
              <Text style={styles.labDetail}>
                Email: {contract.lab.email}
              </Text>
            )}
            {contract.lab.trn && (
              <Text style={styles.labDetail}>TRN: {contract.lab.trn}</Text>
            )}
          </View>
          <View>
            <Text style={styles.contractTitle}>SERVICE{"\n"}CONTRACT</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contract No:</Text>
              <Text style={styles.infoValue}>
                {contract.contractNumber}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {format(new Date(contract.createdAt), "dd MMM yyyy")}
              </Text>
            </View>
            {contract.startDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date:</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(contract.startDate), "dd MMM yyyy")}
                </Text>
              </View>
            )}
            {contract.endDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date:</Text>
                <Text style={styles.infoValue}>
                  {format(new Date(contract.endDate), "dd MMM yyyy")}
                </Text>
              </View>
            )}
            {contract.quotation && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ref. Quotation:</Text>
                <Text style={styles.infoValue}>
                  {contract.quotation.quotationNumber}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusStyle.backgroundColor,
                    color: statusStyle.color,
                  },
                ]}
              >
                {contract.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client */}
        <View style={styles.clientSection}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.clientName}>
            {contract.client.company || contract.client.name}
          </Text>
          {contract.client.company && (
            <Text style={styles.clientDetail}>{contract.client.name}</Text>
          )}
          {contract.client.address && (
            <Text style={styles.clientDetail}>{contract.client.address}</Text>
          )}
          {contract.client.email && (
            <Text style={styles.clientDetail}>{contract.client.email}</Text>
          )}
          {contract.client.trn && (
            <Text style={styles.clientDetail}>TRN: {contract.client.trn}</Text>
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
          {contract.items.map((item, index) => (
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
                {formatCurrency(contract.subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tax ({contract.taxRate}%)
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(contract.taxAmount)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(contract.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {contract.terms && (
          <View style={styles.termsSection}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{contract.terms}</Text>
          </View>
        )}

        {/* Notes */}
        {contract.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{contract.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This contract is binding upon acceptance and signature by both parties.
          </Text>
          <Text style={styles.footerText}>
            {contract.lab.name || "Spectrum Testing & Inspection"}
            {contract.lab.phone ? ` | Tel: ${contract.lab.phone}` : ""}
            {contract.lab.email ? ` | ${contract.lab.email}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateContractPDF(contract: ContractPDFProps["contract"]) {
  const buffer = await renderToBuffer(<ContractPDF contract={contract} />)
  return buffer
}
