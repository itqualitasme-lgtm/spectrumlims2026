import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import { format } from "date-fns"

// ============= TYPES =============

interface LabInfo {
  id: string
  name: string
  code: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  trn?: string | null
  logo?: string | null
  reportHeaderText?: string | null
  reportFooterText?: string | null
}

interface CustomerInfo {
  id: string
  code: string
  name: string
  email?: string | null
  company?: string | null
  phone?: string | null
  address?: string | null
  contactPerson?: string | null
  trn?: string | null
}

interface SampleTypeInfo {
  id: string
  name: string
  description?: string | null
}

interface TestResultInfo {
  id: string
  parameter: string
  testMethod?: string | null
  resultValue?: string | null
  unit?: string | null
  specMin?: string | null
  specMax?: string | null
  status: string
}

interface SampleInfo {
  id: string
  sampleNumber: string
  description?: string | null
  quantity?: string | null
  priority: string
  status: string
  collectionDate?: Date | string | null
  collectionLocation?: string | null
  samplePoint?: string | null
  notes?: string | null
  client: CustomerInfo
  sampleType: SampleTypeInfo
  testResults: TestResultInfo[]
}

interface UserInfo {
  id: string
  name: string
  designation?: string | null
  signatureUrl?: string | null
}

interface ReportInfo {
  id: string
  reportNumber: string
  reportType: string
  title?: string | null
  summary?: string | null
  status: string
  createdAt: Date | string
  reviewedAt?: Date | string | null
  createdBy: UserInfo
  reviewedBy?: UserInfo | null
}

interface TemplateInfo {
  headerText?: string | null
  footerText?: string | null
  logoUrl?: string | null
  accreditationLogoUrl?: string | null
  accreditationText?: string | null
  showLabLogo?: boolean
}

export interface COAPDFProps {
  report: ReportInfo
  sample: SampleInfo
  testResults: TestResultInfo[]
  lab: LabInfo
  customer: CustomerInfo
  template?: TemplateInfo | null
  qrCodeDataUrl?: string
  verificationCode?: string
  verificationUrl?: string
}

// ============= COLORS =============

const BRAND_COLOR = "#1e3a5f"
const BRAND_LIGHT = "#e8eef5"
const HEADER_BG = "#f0f4f8"
const BORDER_COLOR = "#c8d6e5"
const PASS_COLOR = "#16a34a"
const FAIL_COLOR = "#dc2626"
const TEXT_PRIMARY = "#1a1a1a"
const TEXT_SECONDARY = "#4a5568"

// ============= STYLES =============

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 80,
    paddingHorizontal: 40,
    color: TEXT_PRIMARY,
  },

  // Header
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLOR,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerCenter: {
    flex: 1,
    textAlign: "center",
  },
  headerLogo: {
    width: 70,
    height: 40,
    objectFit: "contain" as any,
  },
  accreditationLogo: {
    width: 55,
    height: 35,
    objectFit: "contain" as any,
  },
  labName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
    marginBottom: 3,
    letterSpacing: 1,
    textAlign: "center",
  },
  headerSubline: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    marginBottom: 1,
    textAlign: "center",
  },
  labDetail: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    marginBottom: 1,
    textAlign: "center",
  },
  accreditationTextStyle: {
    fontSize: 7,
    color: BRAND_COLOR,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 2,
  },

  // Title
  title: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
    marginTop: 10,
    marginBottom: 14,
    letterSpacing: 2,
  },

  // Section containers
  sectionRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  sectionHalf: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLOR,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    width: 110,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: TEXT_SECONDARY,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: TEXT_PRIMARY,
  },

  // Report info bar
  reportInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND_LIGHT,
    padding: 8,
    borderRadius: 3,
    marginBottom: 14,
  },
  reportInfoItem: {
    textAlign: "center",
  },
  reportInfoLabel: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  reportInfoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
  },

  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER_COLOR,
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 8,
    textAlign: "center",
    color: TEXT_PRIMARY,
  },

  // Column widths
  colSno: { width: "6%" },
  colParameter: { width: "20%" },
  colTestMethod: { width: "16%" },
  colUnit: { width: "10%" },
  colResult: { width: "12%" },
  colSpecMin: { width: "12%" },
  colSpecMax: { width: "12%" },
  colStatus: { width: "12%" },

  // Status text
  statusPass: {
    color: PASS_COLOR,
    fontFamily: "Helvetica-Bold",
  },
  statusFail: {
    color: FAIL_COLOR,
    fontFamily: "Helvetica-Bold",
  },

  // Summary
  summaryBox: {
    backgroundColor: HEADER_BG,
    padding: 10,
    borderRadius: 3,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLOR,
  },
  summaryText: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    lineHeight: 1.5,
  },

  // Signatures + QR row
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    alignItems: "flex-end",
  },
  signaturesContainer: {
    flexDirection: "row",
    gap: 30,
    flex: 1,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: TEXT_PRIMARY,
    marginBottom: 6,
    marginTop: 10,
  },
  signatureImage: {
    width: 80,
    height: 35,
    objectFit: "contain" as any,
    marginTop: 8,
  },
  signatureLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 8,
    color: TEXT_SECONDARY,
  },
  signatureDesignation: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    fontStyle: "italic",
  },
  signatureDate: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  // QR Code
  qrContainer: {
    alignItems: "center",
    width: 90,
  },
  qrImage: {
    width: 70,
    height: 70,
  },
  qrLabel: {
    fontSize: 6,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 3,
  },
  qrCode: {
    fontSize: 5.5,
    color: BRAND_COLOR,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6.5,
    color: TEXT_SECONDARY,
    fontStyle: "italic",
    marginBottom: 1,
    textAlign: "center",
  },
  footerWebsite: {
    fontSize: 7,
    color: BRAND_COLOR,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  // Page number
  pageNumber: {
    position: "absolute",
    bottom: 12,
    right: 40,
    fontSize: 7,
    color: TEXT_SECONDARY,
  },
})

// ============= HELPERS =============

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A"
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return format(d, "dd MMM yyyy")
  } catch {
    return "N/A"
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ============= PDF COMPONENT =============

export function COAPDF({
  report,
  sample,
  testResults,
  lab,
  customer,
  template,
  qrCodeDataUrl,
  verificationCode,
  verificationUrl,
}: COAPDFProps) {
  // Template overrides lab defaults
  const footerText = template?.footerText || lab.reportFooterText
  const footerLines = footerText
    ? footerText.split("\n").filter((l) => l.trim())
    : [
        "This report shall not be reproduced except in full, without the written approval of the laboratory.",
        "The results relate only to the items tested.",
      ]

  const headerText = template?.headerText || lab.reportHeaderText
  const headerSubLines = headerText
    ? headerText.split("\n").filter((l) => l.trim())
    : []

  const showLabLogo = template?.showLabLogo !== false
  const logoUrl = template?.logoUrl || null
  const accreditationLogoUrl = template?.accreditationLogoUrl || null
  const accreditationText = template?.accreditationText || null
  const hasLogos = (showLabLogo && logoUrl) || accreditationLogoUrl

  return (
    <Document
      title={`COA - ${report.reportNumber}`}
      author={lab.name}
      subject="Certificate of Analysis"
      creator="Spectrum LIMS"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          {hasLogos ? (
            <View style={styles.headerRow}>
              {showLabLogo && logoUrl ? (
                <Image style={styles.headerLogo} src={logoUrl} />
              ) : (
                <View style={{ width: 70 }} />
              )}
              <View style={styles.headerCenter}>
                <Text style={styles.labName}>{lab.name}</Text>
                {headerSubLines.map((line, idx) => (
                  <Text key={idx} style={styles.headerSubline}>{line}</Text>
                ))}
                {accreditationText && (
                  <Text style={styles.accreditationTextStyle}>{accreditationText}</Text>
                )}
              </View>
              {accreditationLogoUrl ? (
                <Image style={styles.accreditationLogo} src={accreditationLogoUrl} />
              ) : (
                <View style={{ width: 55 }} />
              )}
            </View>
          ) : (
            <>
              <Text style={styles.labName}>{lab.name}</Text>
              {headerSubLines.map((line, idx) => (
                <Text key={idx} style={styles.headerSubline}>{line}</Text>
              ))}
            </>
          )}
          {lab.address && <Text style={styles.labDetail}>{lab.address}</Text>}
          <Text style={styles.labDetail}>
            {[lab.phone && `Tel: ${lab.phone}`, lab.email && `Email: ${lab.email}`]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
          {lab.trn && <Text style={styles.labDetail}>TRN: {lab.trn}</Text>}
        </View>

        {/* Title */}
        <Text style={styles.title}>CERTIFICATE OF ANALYSIS</Text>

        {/* Report Info Bar */}
        <View style={styles.reportInfoBar}>
          <View style={styles.reportInfoItem}>
            <Text style={styles.reportInfoLabel}>Report Number</Text>
            <Text style={styles.reportInfoValue}>{report.reportNumber}</Text>
          </View>
          <View style={styles.reportInfoItem}>
            <Text style={styles.reportInfoLabel}>Sample Number</Text>
            <Text style={styles.reportInfoValue}>{sample.sampleNumber}</Text>
          </View>
          <View style={styles.reportInfoItem}>
            <Text style={styles.reportInfoLabel}>Date Issued</Text>
            <Text style={styles.reportInfoValue}>
              {formatDate(report.reviewedAt || report.createdAt)}
            </Text>
          </View>
          <View style={styles.reportInfoItem}>
            <Text style={styles.reportInfoLabel}>Page</Text>
            <Text
              style={styles.reportInfoValue}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </View>

        {/* Client and Sample Info Side by Side */}
        <View style={styles.sectionRow}>
          {/* Client Info */}
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client Name:</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
            </View>
            {customer.company && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Company:</Text>
                <Text style={styles.infoValue}>{customer.company}</Text>
              </View>
            )}
            {customer.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{customer.address}</Text>
              </View>
            )}
            {customer.contactPerson && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact Person:</Text>
                <Text style={styles.infoValue}>{customer.contactPerson}</Text>
              </View>
            )}
            {customer.trn && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>TRN:</Text>
                <Text style={styles.infoValue}>{customer.trn}</Text>
              </View>
            )}
          </View>

          {/* Sample Info */}
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Sample Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sample Type:</Text>
              <Text style={styles.infoValue}>{sample.sampleType.name}</Text>
            </View>
            {sample.description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description:</Text>
                <Text style={styles.infoValue}>{sample.description}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Collection Date:</Text>
              <Text style={styles.infoValue}>{formatDate(sample.collectionDate)}</Text>
            </View>
            {sample.samplePoint && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sample Point:</Text>
                <Text style={styles.infoValue}>{sample.samplePoint}</Text>
              </View>
            )}
            {sample.collectionLocation && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoValue}>{sample.collectionLocation}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority:</Text>
              <Text style={styles.infoValue}>{capitalize(sample.priority)}</Text>
            </View>
          </View>
        </View>

        {/* Test Results Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colSno]}>S.No</Text>
              <Text style={[styles.tableHeaderCell, styles.colParameter, { textAlign: "left" }]}>
                Parameter
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colTestMethod]}>Test Method</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
              <Text style={[styles.tableHeaderCell, styles.colResult]}>Result</Text>
              <Text style={[styles.tableHeaderCell, styles.colSpecMin]}>Spec Min</Text>
              <Text style={[styles.tableHeaderCell, styles.colSpecMax]}>Spec Max</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            </View>

            {/* Table Rows */}
            {testResults.map((result, index) => {
              const isAlt = index % 2 === 1
              const statusLabel =
                result.status === "pass"
                  ? "Pass"
                  : result.status === "fail"
                    ? "Fail"
                    : capitalize(result.status)
              const statusStyle =
                result.status === "pass"
                  ? styles.statusPass
                  : result.status === "fail"
                    ? styles.statusFail
                    : {}

              return (
                <View
                  key={result.id}
                  style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[styles.tableCell, styles.colSno]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, styles.colParameter, { textAlign: "left" }]}>
                    {result.parameter}
                  </Text>
                  <Text style={[styles.tableCell, styles.colTestMethod]}>
                    {result.testMethod || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colUnit]}>
                    {result.unit || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colResult, { fontFamily: "Helvetica-Bold" }]}>
                    {result.resultValue || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colSpecMin]}>
                    {result.specMin || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colSpecMax]}>
                    {result.specMax || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colStatus, statusStyle]}>
                    {statusLabel}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Summary / Remarks */}
        {report.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{report.summary}</Text>
            </View>
          </View>
        )}

        {/* Signatures + QR Code */}
        <View style={styles.bottomSection}>
          <View style={styles.signaturesContainer}>
            <View style={styles.signatureBlock}>
              {report.createdBy.signatureUrl ? (
                <Image style={styles.signatureImage} src={report.createdBy.signatureUrl} />
              ) : (
                <View style={styles.signatureLine} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Prepared By</Text>
              <Text style={styles.signatureName}>{report.createdBy.name}</Text>
              {report.createdBy.designation && (
                <Text style={styles.signatureDesignation}>{report.createdBy.designation}</Text>
              )}
              <Text style={styles.signatureDate}>
                Date: {formatDate(report.createdAt)}
              </Text>
            </View>
            <View style={styles.signatureBlock}>
              {report.reviewedBy?.signatureUrl ? (
                <Image style={styles.signatureImage} src={report.reviewedBy.signatureUrl} />
              ) : (
                <View style={{ marginTop: report.createdBy.signatureUrl ? 35 : 0 }} />
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Approved By</Text>
              <Text style={styles.signatureName}>
                {report.reviewedBy?.name || "___________________"}
              </Text>
              {report.reviewedBy?.designation && (
                <Text style={styles.signatureDesignation}>{report.reviewedBy.designation}</Text>
              )}
              <Text style={styles.signatureDate}>
                Date: {report.reviewedAt ? formatDate(report.reviewedAt) : "___________________"}
              </Text>
            </View>
          </View>

          {/* QR Code for verification */}
          {qrCodeDataUrl && (
            <View style={styles.qrContainer}>
              <Image style={styles.qrImage} src={qrCodeDataUrl} />
              <Text style={styles.qrLabel}>Scan to verify</Text>
              {verificationCode && (
                <Text style={styles.qrCode}>{verificationCode}</Text>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          {footerLines.map((line, idx) => (
            <Text key={idx} style={styles.footerText}>{line}</Text>
          ))}
          {lab.website && <Text style={styles.footerWebsite}>{lab.website}</Text>}
          {verificationUrl && (
            <Text style={[styles.footerText, { marginTop: 2, fontStyle: "normal" }]}>
              Verify this report: {verificationUrl}
            </Text>
          )}
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

// ============= PDF GENERATION UTILITY =============

export async function generateCOAPDF(props: COAPDFProps): Promise<Buffer> {
  const buffer = await renderToBuffer(<COAPDF {...props} />)
  return buffer as Buffer
}
