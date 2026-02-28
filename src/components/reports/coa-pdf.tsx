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
  specificationStandard?: string | null
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
  sampleCondition?: string | null
  sampleCount?: number | null
  priority: string
  status: string
  collectionDate?: Date | string | null
  collectionLocation?: string | null
  samplePoint?: string | null
  reference?: string | null
  registeredAt?: Date | string | null
  notes?: string | null
  samplingMethod?: string | null
  drawnBy?: string | null
  deliveredBy?: string | null
  sheetNumber?: string | null
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

interface TestedByInfo {
  id: string
  name: string
}

interface ReportInfo {
  id: string
  reportNumber: string
  reportType: string
  title?: string | null
  summary?: string | null
  remarks?: string | null
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
  isoLogoUrl?: string | null
  sealUrl?: string | null
  headerImageUrl?: string | null
  footerImageUrl?: string | null
  showLabLogo?: boolean
}

export interface COAPDFProps {
  report: ReportInfo
  sample: SampleInfo
  testResults: TestResultInfo[]
  lab: LabInfo
  customer: CustomerInfo
  testedBy?: TestedByInfo
  template?: TemplateInfo | null
  qrCodeDataUrl?: string
  verificationCode?: string
  verificationUrl?: string
  showHeaderFooter?: boolean
}

// ============= COLORS =============

const RED_BRAND = "#c41e1e"
const BLACK = "#000000"
const BORDER = "#000000"
const GRAY_BG = "#f5f5f5"
const TEXT_COLOR = "#000000"
const GRAY_TEXT = "#555555"

// ============= STYLES =============

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 80,
    paddingHorizontal: 35,
    color: TEXT_COLOR,
  },
  pageLetterhead: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 120,
    paddingBottom: 140,
    paddingHorizontal: 35,
    color: TEXT_COLOR,
  },

  // ---- Header ----
  header: {
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: RED_BRAND,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: {
    width: 150,
    height: 90,
    objectFit: "contain" as any,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerSubline: {
    fontSize: 7,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 1,
  },
  accreditationLogo: {
    width: 75,
    height: 75,
    objectFit: "contain" as any,
  },
  isoLogo: {
    width: 55,
    height: 55,
    objectFit: "contain" as any,
  },
  labName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: RED_BRAND,
    textAlign: "center",
    marginBottom: 1,
  },

  // ---- Title ----
  titleSection: {
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "center",
  },

  // ---- Report Number line ----
  reportNoRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  reportNoText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
  },

  // ---- Info Section ----
  infoSection: {
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    minHeight: 14,
    alignItems: "center",
  },
  infoLabel: {
    width: 130,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    paddingLeft: 4,
    paddingVertical: 2,
  },
  infoSep: {
    width: 10,
    fontSize: 8,
    color: BLACK,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: BLACK,
    paddingVertical: 2,
    paddingRight: 4,
  },
  infoGrid: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  infoGridLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 14,
  },
  infoGridRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 0.5,
    borderLeftColor: BORDER,
    minHeight: 14,
  },
  infoGridLabel: {
    width: 100,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    paddingLeft: 4,
    paddingVertical: 2,
  },
  infoGridSep: {
    width: 10,
    fontSize: 8,
    color: BLACK,
  },
  infoGridValue: {
    flex: 1,
    fontSize: 8,
    color: BLACK,
    paddingVertical: 2,
    paddingRight: 4,
  },

  // ---- Test Results Header ----
  testResultsTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "center",
    marginBottom: 3,
    textDecoration: "underline",
  },

  // ---- Table ----
  table: {
    marginBottom: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: GRAY_BG,
  },
  tableCell: {
    fontSize: 7.5,
    color: BLACK,
    textAlign: "center",
    paddingVertical: 2.5,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: BORDER,
  },

  // Column widths matching reference: Test | Method | Unit | Specification | Result
  colTest: { width: "25%" },
  colMethod: { width: "22%" },
  colUnit: { width: "12%" },
  colSpec: { width: "21%" },
  colResult: { width: "20%" },

  // ---- Meta section (below table) ----
  metaSection: {
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    minHeight: 14,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    width: 145,
    color: BLACK,
    paddingLeft: 4,
    paddingVertical: 2,
  },
  metaSep: {
    fontSize: 8,
    width: 10,
    color: BLACK,
  },
  metaValue: {
    fontSize: 8,
    color: BLACK,
    paddingVertical: 2,
  },
  metaNote: {
    fontSize: 7.5,
    color: BLACK,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },

  // ---- Reported By + Signatures ----
  reportedBySection: {
    marginTop: 8,
  },
  reportedByLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 3,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    alignItems: "flex-end",
  },
  signatureBlock: {
    flex: 1,
    alignItems: "center",
  },
  signatureImage: {
    width: 55,
    height: 24,
    objectFit: "contain" as any,
    marginBottom: 2,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    marginBottom: 3,
  },
  signatureLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 1,
    textAlign: "center",
  },
  signatureName: {
    fontSize: 7,
    color: GRAY_TEXT,
    textAlign: "center",
  },
  signatureDesignation: {
    fontSize: 6.5,
    color: GRAY_TEXT,
    fontStyle: "italic",
    textAlign: "center",
  },

  // ---- QR Code ----
  qrContainer: {
    flex: 1,
    alignItems: "center",
  },
  qrImage: {
    width: 60,
    height: 60,
  },
  qrLabel: {
    fontSize: 5,
    color: GRAY_TEXT,
    textAlign: "center",
    marginTop: 1,
  },
  qrCode: {
    fontSize: 4.5,
    color: RED_BRAND,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },

  // ---- Footer ----
  footer: {
    position: "absolute",
    bottom: 18,
    left: 35,
    right: 35,
  },
  footerDisclaimer: {
    fontSize: 5.5,
    color: GRAY_TEXT,
    marginBottom: 1,
    lineHeight: 1.4,
  },
  footerBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: RED_BRAND,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 3,
  },
  footerBarText: {
    fontSize: 6,
    color: "#ffffff",
    textAlign: "center",
  },
  pageNumber: {
    position: "absolute",
    bottom: 8,
    right: 35,
    fontSize: 6.5,
    color: GRAY_TEXT,
  },
  footerLetterhead: {
    position: "absolute",
    bottom: 95,
    left: 35,
    right: 35,
  },
  pageNumberLetterhead: {
    position: "absolute",
    bottom: 85,
    right: 35,
    fontSize: 6.5,
    color: GRAY_TEXT,
  },
})

// ============= HELPERS =============

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A"
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return format(d, "dd-MM-yyyy")
  } catch {
    return "N/A"
  }
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A"
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return format(d, "dd-MM-yyyy HH:mm")
  } catch {
    return "N/A"
  }
}

function buildSpecString(specMin?: string | null, specMax?: string | null): string {
  if (specMin && specMax) return `${specMin} - ${specMax}`
  if (specMin) return `Min ${specMin}`
  if (specMax) return `Max ${specMax}`
  return "-"
}

// ============= PDF COMPONENT =============

export function COAPDF({
  report,
  sample,
  testResults,
  lab,
  customer,
  testedBy,
  template,
  qrCodeDataUrl,
  verificationCode,
  verificationUrl,
  showHeaderFooter = true,
}: COAPDFProps) {
  // Template overrides lab defaults
  const footerText = template?.footerText || lab.reportFooterText
  const footerLines = footerText
    ? footerText.split("\n").filter((l) => l.trim())
    : [
        "The test Report shall not be reproduced (except in full) without the written approval of SPECTRUM.",
        "When analysis is witnessed by us or carried out by sub contract labs, our responsibility is solely to ensure that the analysis is conducted to standard test methods in accordance with industry accepted practice.",
        "We are not responsible for apparatus, instrumentation and measuring devices, their calibration or working order, reagents and solutions are accepted as prepared.",
      ]

  const headerText = template?.headerText || lab.reportHeaderText
  const headerSubLines = headerText
    ? headerText.split("\n").filter((l) => l.trim())
    : []

  const showLabLogo = template?.showLabLogo !== false
  const logoUrl = template?.logoUrl || lab.logo || null
  const accreditationLogoUrl = template?.accreditationLogoUrl || null
  const accreditationText = template?.accreditationText || null
  const isoLogoUrl = template?.isoLogoUrl || null
  const headerImageUrl = template?.headerImageUrl || null
  const footerImageUrl = template?.footerImageUrl || null

  // Determine title — strip sample type suffix if already appended (e.g. "CERTIFICATE OF QUALITY - DIESEL")
  const rawTitle = report.title || "CERTIFICATE OF QUALITY"
  const sampleTypeName = sample.sampleType.name
  const typeSuffix = ` - ${sampleTypeName}`
  const reportTitle = rawTitle.toUpperCase().endsWith(typeSuffix.toUpperCase())
    ? rawTitle.slice(0, -typeSuffix.length)
    : rawTitle

  // Specification standard for table column header (e.g. "ISO 8217: 2024")
  const specStandard = sample.sampleType.specificationStandard || "Specification"

  // Chemist / tested by name
  const testedByName = testedBy?.name || "-"

  return (
    <Document
      title={`${report.reportNumber} - ${reportTitle}`}
      author={lab.name}
      subject={reportTitle}
      creator="Spectrum LIMS"
    >
      <Page size="A4" style={showHeaderFooter ? styles.page : styles.pageLetterhead}>
        {/* ===== HEADER (fixed on every page) ===== */}
        {showHeaderFooter && headerImageUrl ? (
        <View style={{ marginBottom: 6 }} fixed>
          <Image src={headerImageUrl} style={{ width: "100%", objectFit: "contain" as any }} />
        </View>
        ) : showHeaderFooter ? (
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            {showLabLogo && logoUrl ? (
              <Image style={styles.headerLogo} src={logoUrl} />
            ) : (
              <View style={{ width: 150 }} />
            )}
            <View style={styles.headerCenter}>
              {headerSubLines.length > 0 && (
                <Text style={{ fontSize: 7, color: GRAY_TEXT, marginBottom: 1, textAlign: "center" }}>
                  {headerSubLines[0]}
                </Text>
              )}
              <Text style={styles.labName}>{lab.name}</Text>
              {headerSubLines.slice(1).map((line, idx) => (
                <Text key={idx} style={styles.headerSubline}>{line}</Text>
              ))}
              {accreditationText && (
                <Text style={{ fontSize: 6.5, color: RED_BRAND, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 1 }}>
                  {accreditationText}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isoLogoUrl && (
                <Image style={styles.isoLogo} src={isoLogoUrl} />
              )}
              {accreditationLogoUrl ? (
                <Image style={styles.accreditationLogo} src={accreditationLogoUrl} />
              ) : !isoLogoUrl ? (
                <View style={{ width: 75 }} />
              ) : null}
            </View>
          </View>
        </View>
        ) : null}

        {/* ===== TITLE ===== */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{reportTitle.toUpperCase()}</Text>
          <Text style={styles.subtitle}>{sampleTypeName.toUpperCase()}</Text>
        </View>

        {/* ===== REPORT NO ===== */}
        <View style={styles.reportNoRow}>
          <Text style={styles.reportNoText}>
            REPORT NO.: {report.reportNumber}
          </Text>
        </View>

        {/* ===== CLIENT & SAMPLE INFO ===== */}
        <View style={styles.infoSection}>
          {/* Client */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client</Text>
            <Text style={styles.infoSep}>:</Text>
            <Text style={[styles.infoValue, { fontFamily: "Helvetica-Bold" }]}>
              {customer.company || customer.name}{customer.address ? `, ${customer.address}` : ""}
            </Text>
          </View>

          {/* Sample Description */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sample Description</Text>
            <Text style={styles.infoSep}>:</Text>
            <Text style={styles.infoValue}>
              {sample.description || sampleTypeName}
              {sample.samplePoint ? ` | ${sample.samplePoint}` : ""}
            </Text>
          </View>

          {/* Sample Delivered By & Sample Drawn By */}
          <View style={styles.infoGrid}>
            <View style={styles.infoGridLeft}>
              <Text style={styles.infoGridLabel}>Sample Delivered By</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>{sample.deliveredBy || customer.contactPerson || customer.name}</Text>
            </View>
            <View style={styles.infoGridRight}>
              <Text style={styles.infoGridLabel}>Sample Drawn By</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>{sample.drawnBy || "NP & Spectrum"}</Text>
            </View>
          </View>

          {/* No. of Samples & Condition */}
          <View style={styles.infoGrid}>
            <View style={styles.infoGridLeft}>
              <Text style={styles.infoGridLabel}>No. of Samples</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>
                {sample.sampleCount ? `${sample.sampleCount} x ${sample.quantity || "Bottle"}` : sample.quantity || "-"}
              </Text>
            </View>
            <View style={styles.infoGridRight}>
              <Text style={styles.infoGridLabel}>Condition of Sample</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>{sample.sampleCondition || "-"}</Text>
            </View>
          </View>

          {/* Reference & Sheet No */}
          {(sample.reference || sample.sheetNumber) && (
            <View style={styles.infoGrid}>
              <View style={styles.infoGridLeft}>
                <Text style={styles.infoGridLabel}>{sample.reference ? "Reference" : ""}</Text>
                <Text style={styles.infoGridSep}>{sample.reference ? ":" : ""}</Text>
                <Text style={styles.infoGridValue}>{sample.reference || ""}</Text>
              </View>
              <View style={styles.infoGridRight}>
                <Text style={styles.infoGridLabel}>{sample.sheetNumber ? "Sheet No." : ""}</Text>
                <Text style={styles.infoGridSep}>{sample.sheetNumber ? ":" : ""}</Text>
                <Text style={styles.infoGridValue}>{sample.sheetNumber || ""}</Text>
              </View>
            </View>
          )}

          {/* Dates: Received & Reported */}
          <View style={styles.infoGrid}>
            <View style={styles.infoGridLeft}>
              <Text style={styles.infoGridLabel}>Date Received</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>
                {formatDate(sample.registeredAt || sample.collectionDate)}
              </Text>
            </View>
            <View style={styles.infoGridRight}>
              <Text style={styles.infoGridLabel}>Date Reported</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>
                {formatDateTime(report.reviewedAt || report.createdAt)}
              </Text>
            </View>
          </View>

          {/* Dates: Tested & Sample No */}
          <View style={[styles.infoGrid, { borderBottomWidth: 0 }]}>
            <View style={styles.infoGridLeft}>
              <Text style={styles.infoGridLabel}>Date Tested</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>
                {formatDate(report.createdAt)}
              </Text>
            </View>
            <View style={styles.infoGridRight}>
              <Text style={styles.infoGridLabel}>Sample No</Text>
              <Text style={styles.infoGridSep}>:</Text>
              <Text style={styles.infoGridValue}>{sample.sampleNumber}</Text>
            </View>
          </View>
        </View>

        {/* ===== TEST RESULTS ===== */}
        <Text style={styles.testResultsTitle}>TEST RESULTS</Text>

        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colTest, { textAlign: "left", paddingLeft: 4 }]}>Test</Text>
            <Text style={[styles.tableHeaderCell, styles.colMethod]}>Method</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, styles.colSpec]}>{specStandard}</Text>
            <Text style={[styles.tableHeaderCell, styles.colResult, { borderRightWidth: 0 }]}>Result</Text>
          </View>

          {/* Table Rows */}
          {testResults.map((result, index) => {
            const isAlt = index % 2 === 1
            const isFail = result.status === "fail"
            return (
              <View
                key={result.id}
                style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[styles.tableCell, styles.colTest, { textAlign: "left", paddingLeft: 4 }]}>
                  {result.parameter}
                </Text>
                <Text style={[styles.tableCell, styles.colMethod]}>
                  {result.testMethod || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colUnit]}>
                  {result.unit || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colSpec]}>
                  {buildSpecString(result.specMin, result.specMax)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colResult,
                    { borderRightWidth: 0, fontFamily: "Helvetica-Bold" },
                    isFail ? { color: "#dc2626" } : {},
                  ]}
                >
                  {result.resultValue || "-"}
                </Text>
              </View>
            )
          })}
        </View>

        {/* ===== REMARKS ===== */}
        {(report.remarks || report.summary) && (
          <View style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
              *Remarks:
            </Text>
            <Text style={{ fontSize: 7.5, color: BLACK, lineHeight: 1.5 }}>
              {report.remarks || report.summary}
            </Text>
          </View>
        )}

        {/* ===== META INFO ===== */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Test method deviation</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>None</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Test conducted by</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{testedByName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Report prepared by</Text>
            <Text style={styles.metaSep}>:</Text>
            <Text style={styles.metaValue}>{report.createdBy.name}</Text>
          </View>
          <Text style={styles.metaNote}>
            The above test results are only applicable to the sample(s) referred above
          </Text>
        </View>

        {/* ===== REPORTED BY + SIGNATURE + SEAL + QR ===== */}
        <View style={styles.reportedBySection}>
          <Text style={styles.reportedByLabel}>Reported by:</Text>

          <View style={styles.signaturesRow}>
            {/* Lab Manager Signature (left) */}
            <View style={styles.signatureBlock}>

              {showHeaderFooter && report.reviewedBy?.signatureUrl && (
                <Image style={styles.signatureImage} src={report.reviewedBy.signatureUrl} />
              )}
              <View style={styles.signatureLine} />
              {report.reviewedBy ? (
                <>
                  <Text style={styles.signatureName}>{report.reviewedBy.name}</Text>
                  {report.reviewedBy.designation && (
                    <Text style={styles.signatureDesignation}>{report.reviewedBy.designation}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.signatureName}>Laboratory Manager</Text>
              )}
            </View>

            {/* QR Code in center */}
            {qrCodeDataUrl ? (
              <View style={styles.qrContainer}>
                <Image style={styles.qrImage} src={qrCodeDataUrl} />
                <Text style={styles.qrLabel}>Scan to verify</Text>
                {verificationCode && (
                  <Text style={styles.qrCode}>{verificationCode}</Text>
                )}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {/* Company Seal (right) — hidden for letterhead */}
            <View style={styles.signatureBlock}>
              {showHeaderFooter && template?.sealUrl && (
                <Image
                  style={{ width: 110, height: 110, objectFit: "contain" as any }}
                  src={template.sealUrl}
                />
              )}
            </View>
          </View>
        </View>

        {/* ===== FOOTER (fixed on every page) ===== */}
        <View style={showHeaderFooter ? styles.footer : styles.footerLetterhead} fixed>
          {/* Disclaimer text */}
          {footerLines.map((line, idx) => (
            <Text key={idx} style={styles.footerDisclaimer}>{line}</Text>
          ))}

          {verificationUrl && (
            <Text style={[styles.footerDisclaimer, { marginTop: 1 }]}>
              Verify this report: {verificationUrl}
            </Text>
          )}

          {/* Footer bar — image or red contact bar */}
          {showHeaderFooter && footerImageUrl ? (
            <Image src={footerImageUrl} style={{ width: "100%", marginTop: 3, objectFit: "contain" as any }} />
          ) : showHeaderFooter ? (
          <View style={styles.footerBar}>
            <Text style={styles.footerBarText}>
              {[
                lab.phone && `Tel.: ${lab.phone}`,
                lab.address,
                lab.email && `E-mail: ${lab.email}`,
                lab.website,
              ]
                .filter(Boolean)
                .join("  |  ")}
            </Text>
          </View>
          ) : null}
        </View>

        {/* Page Number */}
        <Text
          style={showHeaderFooter ? styles.pageNumber : styles.pageNumberLetterhead}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}

// ============= BATCH PDF (multiple reports in one document) =============

function COABatchPDF({ reports }: { reports: COAPDFProps[] }) {
  return (
    <Document
      title={`COA Reports - ${reports.length} certificates`}
      author={reports[0]?.lab.name || "Spectrum LIMS"}
      subject="Certificate of Quality"
      creator="Spectrum LIMS"
    >
      {reports.map((props, idx) => {
        // Duplicate the page rendering logic inline via a helper
        return <COAPageContent key={idx} {...props} />
      })}
    </Document>
  )
}

// Extract page content to a reusable component
function COAPageContent(props: COAPDFProps) {
  const {
    report,
    sample,
    testResults,
    lab,
    testedBy,
    template,
    qrCodeDataUrl,
    verificationUrl,
    showHeaderFooter = true,
  } = props

  const footerText = template?.footerText || lab.reportFooterText
  const footerLines = footerText
    ? footerText.split("\n").filter((l) => l.trim())
    : [
        "The test Report shall not be reproduced (except in full) without the written approval of SPECTRUM.",
        "When analysis is witnessed by us or carried out by sub contract labs, our responsibility is solely to ensure that the analysis is conducted to standard test methods in accordance with industry accepted practice.",
        "We are not responsible for apparatus, instrumentation and measuring devices, their calibration or working order, reagents and solutions are accepted as prepared.",
      ]

  const headerText = template?.headerText || lab.reportHeaderText
  const headerSubLines = headerText
    ? headerText.split("\n").filter((l) => l.trim())
    : []

  const showLabLogo = template?.showLabLogo !== false
  const logoUrl = template?.logoUrl || lab.logo || null
  const accreditationLogoUrl = template?.accreditationLogoUrl || null
  const accreditationText = template?.accreditationText || null
  const isoLogoUrl = template?.isoLogoUrl || null
  const headerImageUrl = template?.headerImageUrl || null
  const footerImageUrl = template?.footerImageUrl || null

  const rawTitle2 = report.title || "CERTIFICATE OF QUALITY"
  const sampleTypeName = sample.sampleType.name
  const typeSuffix2 = ` - ${sampleTypeName}`
  const reportTitle = rawTitle2.toUpperCase().endsWith(typeSuffix2.toUpperCase())
    ? rawTitle2.slice(0, -typeSuffix2.length)
    : rawTitle2
  const specStandard = sample.sampleType.specificationStandard || "Specification"
  const testedByName = testedBy?.name || "-"

  const clientName = sample.client.company || sample.client.name
  const collectionDateStr = sample.collectionDate
    ? format(new Date(sample.collectionDate), "dd MMM yyyy")
    : "-"
  const registeredAtStr = sample.registeredAt
    ? format(new Date(sample.registeredAt), "dd MMM yyyy")
    : collectionDateStr
  const reportDateStr = report.reviewedAt
    ? format(new Date(report.reviewedAt), "dd MMM yyyy HH:mm")
    : format(new Date(report.createdAt), "dd MMM yyyy HH:mm")

  const completedResults = testResults.filter(
    (r) => r.status === "completed" && r.resultValue
  )

  const specDisplay = (min: string | null | undefined, max: string | null | undefined): string => {
    if (min && max) return `${min} - ${max}`
    if (min) return `Min ${min}`
    if (max) return `Max ${max}`
    return "-"
  }

  return (
    <Page size="A4" style={showHeaderFooter ? styles.page : styles.pageLetterhead}>
      {/* HEADER (fixed on every page) */}
      {showHeaderFooter && headerImageUrl ? (
      <View style={{ marginBottom: 6 }} fixed>
        <Image src={headerImageUrl} style={{ width: "100%", objectFit: "contain" as any }} />
      </View>
      ) : showHeaderFooter ? (
      <View style={styles.header} fixed>
        <View style={styles.headerRow}>
          {showLabLogo && logoUrl ? (
            <Image style={styles.headerLogo} src={logoUrl} />
          ) : (
            <View style={{ width: 150 }} />
          )}
          <View style={styles.headerCenter}>
            {headerSubLines.length > 0 && (
              <Text style={{ fontSize: 7, color: GRAY_TEXT, marginBottom: 1, textAlign: "center" }}>
                {headerSubLines[0]}
              </Text>
            )}
            <Text style={styles.labName}>{lab.name}</Text>
            {headerSubLines.slice(1).map((line, idx) => (
              <Text key={idx} style={styles.headerSubline}>{line}</Text>
            ))}
            {accreditationText && (
              <Text style={{ fontSize: 6.5, color: RED_BRAND, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 1 }}>
                {accreditationText}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isoLogoUrl && (
              <Image style={styles.isoLogo} src={isoLogoUrl} />
            )}
            {accreditationLogoUrl ? (
              <Image style={styles.accreditationLogo} src={accreditationLogoUrl} />
            ) : !isoLogoUrl ? (
              <View style={{ width: 75 }} />
            ) : null}
          </View>
        </View>
      </View>
      ) : null}

      {/* TITLE */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{reportTitle.toUpperCase()}</Text>
        <Text style={styles.subtitle}>{sampleTypeName.toUpperCase()}</Text>
      </View>

      {/* REPORT NO */}
      <View style={styles.reportNoRow}>
        <Text style={styles.reportNoText}>
          REPORT NO.: {report.reportNumber}
        </Text>
      </View>

      {/* CLIENT & SAMPLE INFO */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Client</Text>
          <Text style={styles.infoSep}>:</Text>
          <Text style={[styles.infoValue, { fontFamily: "Helvetica-Bold" }]}>{clientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sample Description</Text>
          <Text style={styles.infoSep}>:</Text>
          <Text style={styles.infoValue}>
            {sample.description || sampleTypeName}
            {sample.samplePoint ? ` | ${sample.samplePoint}` : ""}
          </Text>
        </View>

        {/* Delivered By & Drawn By */}
        <View style={styles.infoGrid}>
          <View style={styles.infoGridLeft}>
            <Text style={styles.infoGridLabel}>Sample Delivered By</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{sample.deliveredBy || clientName}</Text>
          </View>
          <View style={styles.infoGridRight}>
            <Text style={styles.infoGridLabel}>Sample Drawn By</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{sample.drawnBy || "NP & Spectrum"}</Text>
          </View>
        </View>

        {/* No. of Samples & Condition */}
        <View style={styles.infoGrid}>
          <View style={styles.infoGridLeft}>
            <Text style={styles.infoGridLabel}>No. of Samples</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>
              {sample.sampleCount ? `${sample.sampleCount} x ${sample.quantity || "Bottle"}` : sample.quantity || "-"}
            </Text>
          </View>
          <View style={styles.infoGridRight}>
            <Text style={styles.infoGridLabel}>Condition of Sample</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{sample.sampleCondition || "-"}</Text>
          </View>
        </View>

        {/* Reference & Sheet No */}
        {(sample.reference || sample.sheetNumber) && (
          <View style={styles.infoGrid}>
            <View style={styles.infoGridLeft}>
              <Text style={styles.infoGridLabel}>{sample.reference ? "Reference" : ""}</Text>
              <Text style={styles.infoGridSep}>{sample.reference ? ":" : ""}</Text>
              <Text style={styles.infoGridValue}>{sample.reference || ""}</Text>
            </View>
            <View style={styles.infoGridRight}>
              <Text style={styles.infoGridLabel}>{sample.sheetNumber ? "Sheet No." : ""}</Text>
              <Text style={styles.infoGridSep}>{sample.sheetNumber ? ":" : ""}</Text>
              <Text style={styles.infoGridValue}>{sample.sheetNumber || ""}</Text>
            </View>
          </View>
        )}

        {/* Dates: Received & Report */}
        <View style={styles.infoGrid}>
          <View style={styles.infoGridLeft}>
            <Text style={styles.infoGridLabel}>Date Received</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{registeredAtStr}</Text>
          </View>
          <View style={styles.infoGridRight}>
            <Text style={styles.infoGridLabel}>Date Reported</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{reportDateStr}</Text>
          </View>
        </View>

        {/* Date Tested & Sample No */}
        <View style={[styles.infoGrid, { borderBottomWidth: 0 }]}>
          <View style={styles.infoGridLeft}>
            <Text style={styles.infoGridLabel}>Date Tested</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{formatDate(report.createdAt)}</Text>
          </View>
          <View style={styles.infoGridRight}>
            <Text style={styles.infoGridLabel}>Sample No</Text>
            <Text style={styles.infoGridSep}>:</Text>
            <Text style={styles.infoGridValue}>{sample.sampleNumber}</Text>
          </View>
        </View>
      </View>

      {/* TEST RESULTS TABLE */}
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 6 }}>
        TEST RESULTS
      </Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colTest, { textAlign: "left", paddingLeft: 4 }]}>Test</Text>
          <Text style={[styles.tableHeaderCell, styles.colMethod]}>Method</Text>
          <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
          <Text style={[styles.tableHeaderCell, styles.colSpec]}>{specStandard}</Text>
          <Text style={[styles.tableHeaderCell, styles.colResult, { borderRightWidth: 0 }]}>Result</Text>
        </View>
        {completedResults.map((tr, idx) => (
          <View
            key={tr.id}
            style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[styles.tableCell, styles.colTest, { textAlign: "left", paddingLeft: 4 }]}>
              {tr.parameter}
            </Text>
            <Text style={[styles.tableCell, styles.colMethod]}>
              {tr.testMethod || "-"}
            </Text>
            <Text style={[styles.tableCell, styles.colUnit]}>
              {tr.unit || "-"}
            </Text>
            <Text style={[styles.tableCell, styles.colSpec]}>
              {specDisplay(tr.specMin, tr.specMax)}
            </Text>
            <Text style={[styles.tableCell, styles.colResult, { borderRightWidth: 0, fontFamily: "Helvetica-Bold" }]}>
              {tr.resultValue || "-"}
            </Text>
          </View>
        ))}
      </View>

      {/* REMARKS */}
      {report.summary && (
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
            *Remarks:
          </Text>
          <Text style={{ fontSize: 7.5, color: BLACK, lineHeight: 1.5 }}>
            {report.summary}
          </Text>
        </View>
      )}

      {/* META INFO */}
      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Test method deviation</Text>
          <Text style={styles.metaSep}>:</Text>
          <Text style={styles.metaValue}>None</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Test conducted by</Text>
          <Text style={styles.metaSep}>:</Text>
          <Text style={styles.metaValue}>{testedByName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Report prepared by</Text>
          <Text style={styles.metaSep}>:</Text>
          <Text style={styles.metaValue}>{report.createdBy.name}</Text>
        </View>
        <Text style={styles.metaNote}>
          The above test results are only applicable to the sample(s) referred above
        </Text>
      </View>

      {/* REPORTED BY + SIGNATURES + QR */}
      <View style={styles.reportedBySection}>
        <Text style={styles.reportedByLabel}>Reported by:</Text>

        <View style={styles.signaturesRow}>
          {/* Tested By (Chemist) - left */}
          <View style={styles.signatureBlock}>
            {showHeaderFooter && report.createdBy.signatureUrl && (
              <Image style={styles.signatureImage} src={report.createdBy.signatureUrl} />
            )}
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{report.createdBy.name}</Text>
            {report.createdBy.designation && (
              <Text style={styles.signatureDesignation}>{report.createdBy.designation}</Text>
            )}
          </View>

          {/* Authenticated By (Lab Manager) */}
          <View style={styles.signatureBlock}>
            {showHeaderFooter && report.reviewedBy?.signatureUrl && (
              <Image style={styles.signatureImage} src={report.reviewedBy.signatureUrl} />
            )}
            <View style={styles.signatureLine} />
            {report.reviewedBy ? (
              <>
                <Text style={styles.signatureName}>{report.reviewedBy.name}</Text>
                {report.reviewedBy.designation && (
                  <Text style={styles.signatureDesignation}>{report.reviewedBy.designation}</Text>
                )}
              </>
            ) : (
              <Text style={styles.signatureName}>Laboratory Manager</Text>
            )}
          </View>

          {/* QR Code */}
          {qrCodeDataUrl ? (
            <View style={styles.qrContainer}>
              <Image style={styles.qrImage} src={qrCodeDataUrl} />
              <Text style={styles.qrLabel}>Scan to verify</Text>
              {props.verificationCode && (
                <Text style={styles.qrCode}>{props.verificationCode}</Text>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {/* Company Seal (right) */}
          <View style={styles.signatureBlock}>
            {showHeaderFooter && template?.sealUrl && (
              <Image
                style={{ width: 110, height: 110, objectFit: "contain" as any }}
                src={template.sealUrl}
              />
            )}
          </View>
        </View>
      </View>

      {/* FOOTER (fixed on every page) */}
      <View style={showHeaderFooter ? styles.footer : styles.footerLetterhead} fixed>
        {footerLines.map((line, idx) => (
          <Text key={idx} style={styles.footerDisclaimer}>{line}</Text>
        ))}

        {verificationUrl && (
          <Text style={[styles.footerDisclaimer, { marginTop: 1 }]}>
            Verify this report: {verificationUrl}
          </Text>
        )}

        {/* Red contact bar — hidden for letterhead printing */}
        {/* Footer bar — image or red contact bar */}
        {showHeaderFooter && footerImageUrl ? (
          <Image src={footerImageUrl} style={{ width: "100%", marginTop: 3, objectFit: "contain" as any }} />
        ) : showHeaderFooter ? (
        <View style={styles.footerBar}>
          <Text style={styles.footerBarText}>
            {[
              lab.phone && `Tel.: ${lab.phone}`,
              lab.address,
              lab.email && `E-mail: ${lab.email}`,
              lab.website,
            ]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
        </View>
        ) : null}
      </View>

      {/* Page Number */}
      <Text
        style={showHeaderFooter ? styles.pageNumber : styles.pageNumberLetterhead}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        fixed
      />
    </Page>
  )
}

// ============= PDF GENERATION UTILITY =============

export async function generateCOAPDF(props: COAPDFProps): Promise<Buffer> {
  const buffer = await renderToBuffer(<COAPDF {...props} />)
  return buffer as Buffer
}

export async function generateBatchCOAPDF(reports: COAPDFProps[]): Promise<Buffer> {
  if (reports.length === 1) {
    return generateCOAPDF(reports[0])
  }
  const buffer = await renderToBuffer(<COABatchPDF reports={reports} />)
  return buffer as Buffer
}
