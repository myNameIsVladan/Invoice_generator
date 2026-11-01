import Link from "next/link"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"

export const instant = false

import { AuthShell } from "@/components/auth/auth-shell"
import { createClient } from "@/utils/supabase/server"

type PageProps = {
  searchParams: Promise<{ token?: string }>
}

export default async function ConfirmEmailPage({ searchParams }: PageProps) {
  await connection()
  const { token } = await searchParams

  if (!token) {
    return (
      <AuthShell
        title="Confirm email"
        description="This confirmation link is incomplete."
      >
        <p className="text-sm text-destructive">
          The link is missing a token. Open the link from your confirmation email,
          or sign in and send a new one.
        </p>
        <Link href="/login" className="text-sm text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </AuthShell>
    )
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/auth/confirm?token=${encodeURIComponent(token)}`)}`
    )
  }

  const { error } = await supabase.rpc("confirm_email", { p_token: token })

  if (error) {
    return (
      <AuthShell
        title="Confirm email"
        description="We could not confirm your address with this link."
      >
        <p className="text-sm text-destructive" role="alert">
          {error.message.includes("invalid or expired")
            ? "This confirmation link is invalid or has expired. Send a new confirmation email and open that link."
            : error.message}
        </p>
        <Link
          href="/check-email"
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          Back to confirmation
        </Link>
      </AuthShell>
    )
  }

  redirect("/profile")
}
