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
 * Uses a child process to avoid ESM/bundler issues with Next.js Turbopack.
 */
export async function rasterizePDF(pdfBuffer: Buffer): Promise<Buffer> {
  const { execFileSync } = await import("child_process")

  // Write input PDF to a temp file
  const tmpDir = path.join(process.cwd(), ".tmp")
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

  const inputPath = path.join(tmpDir, `raster-in-${Date.now()}.pdf`)
  const outputPath = path.join(tmpDir, `raster-out-${Date.now()}.pdf`)
  const scriptPath = path.join(process.cwd(), "scripts", "rasterize-pdf.mjs")

  fs.writeFileSync(inputPath, pdfBuffer)

  try {
    execFileSync("node", [scriptPath, inputPath, outputPath], {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    })

    const result = fs.readFileSync(outputPath)
    return result
  } finally {
    // Clean up temp files
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  }
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
