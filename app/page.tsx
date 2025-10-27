import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    try {
      const { error } = await supabase.from("users").select("id").limit(1)

      if (error && error.code === "PGRST205") {
        // Table doesn't exist, redirect to setup
        redirect("/setup")
      }

      redirect("/dashboard")
    } catch (error) {
      // If any error occurs, redirect to setup
      redirect("/setup")
    }
  } else {
    redirect("/login")
  }
}
