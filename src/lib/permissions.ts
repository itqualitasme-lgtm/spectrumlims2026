"use server"

import { auth } from "./auth"

export async function getSession() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Not authenticated")
  }
  return session
}

export async function requirePermission(module: string, action: string) {
  const session = await getSession()
  const user = session.user as any

  // Admin bypasses all permission checks
  if (user.roleName === "Admin") return session

  const requiredPermission = `${module}:${action}`
  const permissions: string[] = user.permissions || []

  if (!permissions.includes(requiredPermission)) {
    throw new Error(`Permission denied: ${requiredPermission}`)
  }

  return session
}

