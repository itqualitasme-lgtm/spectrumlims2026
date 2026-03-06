import { SignPdf } from "@signpdf/signpdf"
import { P12Signer } from "@signpdf/signer-p12"
import { plainAddPlaceholder } from "@signpdf/placeholder-plain"
import { PDFDocument } from "pdf-lib"
import fs from "fs"
import path from "path"

let cachedP12: Buffer | null = null

function getP12Certificate(): Buffer {
  if (cachedP12) return cachedP12

  const certPath = process.env.PDF_SIGNING_CERT_PATH
    || path.join(process.cwd(), "certs", "certificate.p12")

  if (!fs.existsSync(certPath)) {
    throw new Error(`PDF signing certificate not found at: ${certPath}`)
  }

  cachedP12 = fs.readFileSync(certPath)
  return cachedP12
}

/**
 * Rasterize each PDF page to a high-quality PNG image, then rebuild the PDF
 * with only embedded images — no selectable text, no editable objects, no OCR.
 */
export async function rasterizePDF(pdfBuffer: Buffer): Promise<Buffer> {
  // Polyfill DOMMatrix for pdfjs-dist in Node.js environments (needed on Vercel)
  if (typeof globalThis.DOMMatrix === "undefined") {
    const canvas = require("@napi-rs/canvas")
    globalThis.DOMMatrix = canvas.DOMMatrix
  }

  // Dynamic import of ESM-only package — works in-process on both local and Vercel
  const { pdf } = await import("pdf-to-img")

  // Get original page sizes
  const srcDoc = await PDFDocument.load(pdfBuffer)
  const pageSizes = Array.from({ length: srcDoc.getPageCount() }, (_, i) => {
    const p = srcDoc.getPage(i)
    return p.getSize()
  })

  // Render each page to PNG at 3x scale for high quality
  const pageImages: Buffer[] = []
  const converter = await pdf(pdfBuffer, { scale: 3 })
  for await (const pageImage of converter) {
    pageImages.push(Buffer.from(pageImage))
  }

  // Build a new PDF with only the rasterized images
  const destDoc = await PDFDocument.create()
  for (let i = 0; i < pageImages.length; i++) {
    const { width, height } = pageSizes[i] || { width: 595, height: 842 }
    const pngImage = await destDoc.embedPng(pageImages[i])
    const page = destDoc.addPage([width, height])
    page.drawImage(pngImage, { x: 0, y: 0, width, height })
  }

  destDoc.setTitle("Certificate of Quality")
  destDoc.setAuthor("Spectrum LIMS")
  destDoc.setSubject("Official Laboratory Report - Do Not Modify")
  destDoc.setCreator("Spectrum LIMS")
  destDoc.setProducer("Spectrum LIMS - Protected Document")

  const result = await destDoc.save()
  return Buffer.from(result)
}

export async function signPDF(pdfBuffer: Buffer): Promise<Buffer> {
  const p12Buffer = getP12Certificate()
  const passphrase = process.env.PDF_SIGNING_PASSPHRASE || "spectrum-lims-signing"

  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason: "Spectrum LIMS - Official Laboratory Report",
    contactInfo: "info@spectrumlims.com",
    name: "Spectrum LIMS",
    location: "Dubai, UAE",
  })

  const signer = new P12Signer(p12Buffer, { passphrase })
  const signedPdf = await new SignPdf().sign(pdfWithPlaceholder, signer)

  return Buffer.from(signedPdf)
}
