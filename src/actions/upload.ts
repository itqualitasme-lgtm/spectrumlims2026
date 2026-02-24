"use server"

import { getSession } from "@/lib/permissions"
import { uploadFile, getPublicUrl, deleteFile } from "@/lib/supabase"

export async function uploadImage(formData: FormData) {
  const session = await getSession()
  const user = session.user as any
  const labId = user.labId

  const file = formData.get("file") as File
  if (!file || file.size === 0) throw new Error("No file provided")

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPEG, WebP, and SVG are allowed.")
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 2MB.")
  }

  const folder = formData.get("folder") as string || "uploads"
  const ext = file.name.split(".").pop()?.toLowerCase() || "png"
  const timestamp = Date.now()
  const path = `${labId}/${folder}/${timestamp}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadFile(path, buffer, file.type)

  const publicUrl = getPublicUrl(path)
  return { url: publicUrl, path }
}

export async function deleteUploadedFile(path: string) {
  const session = await getSession()
  // Only allow deleting files within the user's lab folder
  const user = session.user as any
  if (!path.startsWith(user.labId + "/")) {
    throw new Error("Unauthorized")
  }

  await deleteFile(path)
  return { success: true }
}
