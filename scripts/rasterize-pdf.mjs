import { readFileSync, writeFileSync } from "fs"
import path from "path"
import { createRequire } from "module"
import { pdf } from "pdf-to-img"
import { PDFDocument } from "pdf-lib"

const require = createRequire(import.meta.url)

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  console.error("Usage: node rasterize-pdf.mjs <input.pdf> <output.pdf>")
  process.exit(1)
}

const pdfBuffer = readFileSync(inputPath)

// Get original page sizes
const srcDoc = await PDFDocument.load(pdfBuffer)
const pageSizes = Array.from({ length: srcDoc.getPageCount() }, (_, i) => {
  const p = srcDoc.getPage(i)
  return p.getSize()
})

// Render each page to PNG at 3x scale
const pageImages = []
const converter = await pdf(pdfBuffer, { scale: 3 })
for await (const pageImage of converter) {
  pageImages.push(Buffer.from(pageImage))
}

// Build a new PDF with only rasterized images
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
writeFileSync(outputPath, Buffer.from(result))
