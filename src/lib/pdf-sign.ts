import { SignPdf } from "@signpdf/signpdf"
import { P12Signer } from "@signpdf/signer-p12"
import { plainAddPlaceholder } from "@signpdf/placeholder-plain"
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
