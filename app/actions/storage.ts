"use server"

import { getSupabaseServiceClient } from "@/lib/supabase/service"

// Usa o client de serviço (service role) direto, sem depender de cookies

export async function ensureBucket(bucketName: string) {
  try {
    const supabase = getSupabaseServiceClient()
    const { data: bucket, error: getErr } = await supabase.storage.getBucket(bucketName)
    if (getErr) {
      // If getBucket returns an error, we still try to create
      console.warn(`[storage.ensureBucket] getBucket error for ${bucketName}:`, getErr.message)
    }
    if (!bucket) {
      const { error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ["image/*"],
      })
      if (createErr) {
        return { error: createErr.message }
      }
      return { success: true, created: true }
    }
    return { success: true, created: false }
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}