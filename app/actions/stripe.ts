"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { beginStripeOnboarding } from "@/lib/invoice/service"
import { getAppUrl } from "@/lib/stripe/server"
import { createClient } from "@/utils/supabase/server"

export async function connectStripeAction() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const url = await beginStripeOnboarding({
    supabase,
    userId: user.id,
    accountEmail: user.email,
    appUrl: await getAppUrl(),
    intent: { intent: "profile" },
  })
  redirect(url)
}
