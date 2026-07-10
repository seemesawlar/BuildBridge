import { supabase } from './supabaseClient'

function safeFileName(file) {
  const ext = file.name.split('.').pop()
  const stamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${random}.${ext}`
}

/**
 * Uploads a file to a bucket at `${folder}/${generatedFileName}` and
 * returns { path, publicUrl } (publicUrl is null for private buckets —
 * use getSignedUrl for those instead).
 */
export async function uploadFile({ bucket, folder, file, isPublic = false }) {
  const path = `${folder}/${safeFileName(file)}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw error

  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return { path, publicUrl: data.publicUrl }
  }

  return { path, publicUrl: null }
}

/** Creates a temporary signed URL for a file in a private bucket. */
export async function getSignedUrl(bucket, path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
