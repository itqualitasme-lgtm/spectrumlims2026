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
import QRCode from "qrcode"

// ============= TYPES =============

export interface LabelSample {
  id: string
  sampleNumber: string
  clientName: string
  sampleTypeName: string
  samplePoint: string | null
  date: string
  time: string | null
  samplerName: string | null
}

export interface LabelPDFProps {
  samples: LabelSample[]
  labName: string
  baseUrl: string
}

interface LabelPDFInternalProps extends LabelPDFProps {
  qrDataUrls: string[]
}

// ============= LAYOUT CONSTANTS =============

const LABELS_PER_ROW = 2
const LABELS_PER_COL = 9
const LABELS_PER_PAGE = LABELS_PER_ROW * LABELS_PER_COL

// ============= STYLES =============

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: {
    width: 256,
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "#d0d0d0",
    borderRadius: 2,
  },
  qrImage: {
    width: 56,
    height: 56,
  },
  textBlock: {
    flex: 1,
    paddingLeft: 6,
    justifyContent: "center",
  },
  sampleNumber: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  clientName: {
    fontSize: 7,
    color: "#333333",
    marginBottom: 1,
  },
  infoText: {
    fontSize: 6.5,
    color: "#555555",
    marginBottom: 0.5,
  },
  labName: {
    fontSize: 5.5,
    color: "#888888",
    marginTop: 1,
  },
})

// ============= PDF COMPONENT =============

function LabelPDF({ samples, labName, qrDataUrls }: LabelPDFInternalProps) {
  // Chunk samples into pages
  const pages: LabelSample[][] = []
  const qrPages: string[][] = []
  for (let i = 0; i < samples.length; i += LABELS_PER_PAGE) {
    pages.push(samples.slice(i, i + LABELS_PER_PAGE))
    qrPages.push(qrDataUrls.slice(i, i + LABELS_PER_PAGE))
  }

  return (
    <Document
      title="Sample Labels"
      author={labName}
      subject="QR Code Labels"
      creator="SPECTRUM LIMS"
    >
      {pages.map((pageSamples, pageIdx) => {
        // Chunk into rows of 2
        const rows: { sample: LabelSample; qr: string }[][] = []
        for (let i = 0; i < pageSamples.length; i += LABELS_PER_ROW) {
          const row: { sample: LabelSample; qr: string }[] = []
          for (let j = 0; j < LABELS_PER_ROW && i + j < pageSamples.length; j++) {
            row.push({
              sample: pageSamples[i + j],
              qr: qrPages[pageIdx][i + j],
            })
          }
          rows.push(row)
        }

        return (
          <Page key={pageIdx} size="A4" style={styles.page}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.row}>
                {row.map((item, colIdx) => (
                  <View key={colIdx} style={styles.label}>
                    <Image src={item.qr} style={styles.qrImage} />
                    <View style={styles.textBlock}>
                      <Text style={styles.sampleNumber}>
                        {item.sample.sampleNumber}
                      </Text>
                      <Text style={styles.clientName}>
                        {item.sample.clientName}
                      </Text>
                      <Text style={styles.infoText}>
                        {item.sample.sampleTypeName}
                      </Text>
                      <Text style={styles.infoText}>
                        {item.sample.date}
                        {item.sample.time ? ` ${item.sample.time}` : ""}
                        {item.sample.samplePoint
                          ? ` | ${item.sample.samplePoint}`
                          : ""}
                      </Text>
                      <Text style={styles.infoText}>
                        {item.sample.samplerName || "Walk-in"}
                      </Text>
                      <Text style={styles.labName}>{labName}</Text>
                    </View>
                  </View>
                ))}
                {/* Fill empty space if odd number of labels in row */}
                {row.length < LABELS_PER_ROW && (
                  <View style={[styles.label, { borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]} />
                )}
              </View>
            ))}
          </Page>
        )
      })}
    </Document>
  )
}

// ============= PDF GENERATION UTILITY =============

export async function generateLabelPDF(
  props: LabelPDFProps
): Promise<Buffer> {
  // Pre-generate all QR code data URLs — encode scan URL so scanning shows live data
  const qrDataUrls = await Promise.all(
    props.samples.map((s) =>
      QRCode.toDataURL(`${props.baseUrl}/scan/${s.id}`, {
        width: 150,
        margin: 1,
        errorCorrectionLevel: "M",
      })
    )
  )

  const buffer = await renderToBuffer(
    <LabelPDF {...props} qrDataUrls={qrDataUrls} />
  )
  return buffer as Buffer
}
