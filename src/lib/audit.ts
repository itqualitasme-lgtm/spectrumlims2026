import { db } from "./db"

export async function logAudit(
  labId: string,
  userId: string | null,
  userName: string | null,
  module: string,
  action: string,
  details?: string
) {
  await db.auditLog.create({
    data: {
      labId,
      userId,
      userName,
      module,
      action,
      details,
    },
  })
}
