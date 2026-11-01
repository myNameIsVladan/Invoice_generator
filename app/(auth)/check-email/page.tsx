import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"

import { signOutAction } from "@/app/actions/sign-out"
import { EmailUnconfirmedAlert } from "@/components/app/email-unconfirmed-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  searchParams: Promise<{ confirmation?: string }>
}

export default async function CheckEmailPage({ searchParams }: PageProps) {
  await connection()
  const { confirmation } = await searchParams
  const confirmationState =
    confirmation === "sent" || confirmation === "failed" ? confirmation : undefined

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed_at")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.email_confirmed_at) {
    redirect("/invoices")
  }

  return (
    <AuthShell
      title="Check your email"
      description="Open the confirmation link to finish registration. Invoices stay unavailable until you do."
      footer={
        <form action={signOutAction}>
          <Button type="submit" variant="link" className="h-auto p-0">
            Sign out
          </Button>
        </form>
      }
    >
      <EmailUnconfirmedAlert confirmation={confirmationState} />
    </AuthShell>
  )
}
