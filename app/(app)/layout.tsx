import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/app/app-header"
import { createClient } from "@/utils/supabase/server"

export const instant = false

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await connection()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed_at, full_name, company_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.email_confirmed_at) {
    redirect("/check-email")
  }

  const company = profile.company_name?.trim()
  const fullName = profile.full_name?.trim()
  const displayName = company || fullName || null

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader email={user.email} displayName={displayName} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
