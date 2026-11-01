import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { loadProfile } from "@/lib/invoice/data"
import { createOnboardingLink, getAppUrl } from "@/lib/stripe/server"
import { createClient } from "@/utils/supabase/server"

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await loadProfile(supabase, user.id)
  if (!profile?.stripe_account_id) {
    redirect("/profile?stripe=incomplete")
  }

  const link = await createOnboardingLink(profile.stripe_account_id, await getAppUrl())
  redirect(link.url)
}
