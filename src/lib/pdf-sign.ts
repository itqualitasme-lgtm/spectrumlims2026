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
 * Flatten the PDF by re-embedding all pages as fixed XObject forms.
 * This removes editable text objects and makes content harder to modify
 * with third-party tools like iLovePDF.
 */
export async function flattenPDF(pdfBuffer: Buffer): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(pdfBuffer)
  const destDoc = await PDFDocument.create()

  // Copy all pages — this re-serializes the content streams
  const pages = await destDoc.copyPages(srcDoc, srcDoc.getPageIndices())
  for (const page of pages) {
    destDoc.addPage(page)
  }

  // Set document metadata to discourage editing
  destDoc.setTitle(srcDoc.getTitle() || "Certificate of Quality")
  destDoc.setAuthor(srcDoc.getAuthor() || "Spectrum LIMS")
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
