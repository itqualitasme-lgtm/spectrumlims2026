import { db } from "./db"

export async function generateNextNumber(
  labId: string,
  module: string,
  fallbackPrefix: string
): Promise<string> {
  // Get current date components for YYMMDD format
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const dateStr = `${yy}${mm}${dd}`

  // Atomic increment on FormatID table
  const formatId = await db.formatID.update({
    where: { labId_module: { labId, module } },
    data: { lastNumber: { increment: 1 } },
  })

  const num = String(formatId.lastNumber).padStart(3, "0")
  return `${formatId.prefix}-${dateStr}-${num}`
}
