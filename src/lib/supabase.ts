import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Storage bucket name
export const STORAGE_BUCKET = "spectrum-lims"

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return data.path
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedUrl(path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`)
  return data.signedUrl
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(path: string) {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([path])

  if (error) throw new Error(`Delete failed: ${error.message}`)
}
