import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { loadProfile } from "@/lib/invoice/data"
import { sendInvoice } from "@/lib/invoice/service"
import { getAppUrl, getStripe } from "@/lib/stripe/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

function rethrowRedirect(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const profile = await loadProfile(supabase, user.id)
  if (!profile?.stripe_account_id) {
    redirect("/profile?stripe=incomplete")
  }

  const account = await getStripe().accounts.retrieve(profile.stripe_account_id)
  const admin = createAdminClient()
  const { error: profileError } = await admin
    .from("profiles")
    .update({ stripe_charges_enabled: Boolean(account.charges_enabled) })
    .eq("id", user.id)

  if (profileError) {
    redirect(`/profile?stripe=error&message=${encodeURIComponent(profileError.message)}`)
  }

  const { data: hold } = await supabase
    .from("invoice_holds")
    .select("payload")
    .eq("user_id", user.id)
    .maybeSingle()

  const payload = hold?.payload as
    | { intent?: string; invoice_id?: number; note?: string }
    | null
  const sending =
    payload?.intent === "send" &&
    typeof payload.invoice_id === "number" &&
    payload.invoice_id > 0

  if (!account.charges_enabled) {
    if (sending && payload?.invoice_id) {
      redirect(`/invoices/${payload.invoice_id}?stripe=incomplete`)
    }
    redirect("/profile?stripe=incomplete")
  }

  if (!sending || !payload?.invoice_id) {
    await supabase.from("invoice_holds").delete().eq("user_id", user.id)
    redirect("/profile?stripe=ready")
  }

  try {
    const result = await sendInvoice({
      supabase,
      userId: user.id,
      accountEmail: user.email,
      invoiceId: payload.invoice_id,
      note: typeof payload.note === "string" ? payload.note : "",
      appUrl: await getAppUrl(),
    })

    if (result.kind === "onboarding") {
      redirect(result.url)
    }
    if (result.kind === "failed") {
      redirect(`/invoices/${result.invoiceId}?send=failed`)
    }
    redirect(`/invoices/${result.invoiceId}?sent=1`)
  } catch (error) {
    rethrowRedirect(error)
    const message = error instanceof Error ? error.message : "The invoice could not be sent."
    redirect(`/invoices/${payload.invoice_id}?stripe=error&message=${encodeURIComponent(message)}`)
  }
}
