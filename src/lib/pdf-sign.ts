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
 * Runs rasterization in a child process to avoid ESM/bundler issues.
 */
export async function rasterizePDF(pdfBuffer: Buffer): Promise<Buffer> {
  const { execFileSync } = await import("child_process")
  const os = await import("os")

  const tmpDir = os.tmpdir()
  const ts = Date.now()
  const inputPath = path.join(tmpDir, `raster-in-${ts}.pdf`)
  const outputPath = path.join(tmpDir, `raster-out-${ts}.pdf`)

  fs.writeFileSync(inputPath, pdfBuffer)

  // Build inline script that uses createRequire to resolve modules from project root
  const projectRoot = process.cwd().replace(/\\/g, "/")
  const script = `
    import { createRequire } from "module";
    import { pathToFileURL } from "url";
    import { readFileSync, writeFileSync } from "fs";
    const require = createRequire("${projectRoot}/index.js");
    const toURL = (p) => pathToFileURL(p).href;
    const { pdf } = await import(toURL(require.resolve("pdf-to-img")));
    const { PDFDocument } = await import(toURL(require.resolve("pdf-lib")));
    const pdfBuffer = readFileSync(process.env.RASTER_INPUT);
    const srcDoc = await PDFDocument.load(pdfBuffer);
    const pageSizes = Array.from({ length: srcDoc.getPageCount() }, (_, i) => {
      const p = srcDoc.getPage(i); return p.getSize();
    });
    const pageImages = [];
    for await (const img of await pdf(pdfBuffer, { scale: 3 })) {
      pageImages.push(Buffer.from(img));
    }
    const destDoc = await PDFDocument.create();
    for (let i = 0; i < pageImages.length; i++) {
      const { width, height } = pageSizes[i] || { width: 595, height: 842 };
      const pngImage = await destDoc.embedPng(pageImages[i]);
      const page = destDoc.addPage([width, height]);
      page.drawImage(pngImage, { x: 0, y: 0, width, height });
    }
    destDoc.setTitle("Certificate of Quality");
    destDoc.setAuthor("Spectrum LIMS");
    destDoc.setSubject("Official Laboratory Report - Do Not Modify");
    destDoc.setCreator("Spectrum LIMS");
    destDoc.setProducer("Spectrum LIMS - Protected Document");
    writeFileSync(process.env.RASTER_OUTPUT, Buffer.from(await destDoc.save()));
  `

  try {
    execFileSync("node", ["--input-type=module", "-e", script], {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        RASTER_INPUT: inputPath,
        RASTER_OUTPUT: outputPath,
      },
    })

    return fs.readFileSync(outputPath)
  } finally {
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
