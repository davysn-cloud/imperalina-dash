import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export type AppSettingKey = "max_capacity"

type AppSettingRow = {
  key: string
  value_int: number | null
  value_json: any | null
}

export async function getAppSettingInt(key: AppSettingKey, fallback?: number): Promise<number | undefined> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from<AppSettingRow>("app_settings")
    .select("key, value_int")
    .eq("key", key)
    .maybeSingle()
  if (error) {
    return fallback
  }
  if (!data) return fallback
  const v = typeof data.value_int === "number" ? data.value_int : undefined
  return v ?? fallback
}

export async function setAppSettingInt(key: AppSettingKey, value: number): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  await supabase
    .from("app_settings")
    .upsert({ key, value_int: value }, { onConflict: "key" })
}