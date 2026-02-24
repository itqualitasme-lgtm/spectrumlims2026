import { db } from "./db"

function getDateStr(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  return `${yy}${mm}${dd}`
}

export async function generateNextNumber(
  labId: string,
  module: string,
  fallbackPrefix: string
): Promise<{ formatted: string; sequenceNumber: number }> {
  const dateStr = getDateStr()

  // Atomic increment on FormatID table
  const formatId = await db.formatID.update({
    where: { labId_module: { labId, module } },
    data: { lastNumber: { increment: 1 } },
  })

  const num = String(formatId.lastNumber).padStart(3, "0")
  return {
    formatted: `${formatId.prefix}-${dateStr}-${num}`,
    sequenceNumber: formatId.lastNumber,
  }
}

export async function generateLinkedNumber(
  labId: string,
  module: string,
  sequenceNumber: number
): Promise<string> {
  const dateStr = getDateStr()

  const formatId = await db.formatID.findUnique({
    where: { labId_module: { labId, module } },
  })

  if (!formatId) throw new Error(`FormatID not found for module: ${module}`)

  const num = String(sequenceNumber).padStart(3, "0")
  return `${formatId.prefix}-${dateStr}-${num}`
}
