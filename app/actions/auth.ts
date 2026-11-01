"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/auth/schemas"
import { issueAndSendConfirmation } from "@/lib/auth/issue-confirmation"
import { getAppUrl, isSafeConfirmNext } from "@/lib/auth/urls"
import { createClient } from "@/utils/supabase/server"

export type AuthActionState = {
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
  success?: string
}

function mapAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect."
  }
  if (lower.includes("email not confirmed")) {
    return "Email or password is incorrect."
  }
  return message
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: mapAuthError(error.message) }
  }

  const next = formData.get("next")
  if (typeof next === "string" && isSafeConfirmNext(next)) {
    redirect(next)
  }

  const { data: confirmedAt } = await supabase.rpc("accept_auth_email_confirmation")

  redirect(confirmedAt ? "/invoices" : "/check-email")
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("already registered") || msg.includes("already exists")) {
      return {
        error:
          "An account with this email already exists. Sign in instead.",
      }
    }
    return { error: mapAuthError(error.message) }
  }

  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Sign in instead.",
    }
  }

  if (!data.session) {
    return {
      error:
        "Your account was created but no session was returned. Confirm that Supabase Confirm email is turned off, then try signing in.",
    }
  }

  const confirmation = await issueAndSendConfirmation(supabase, parsed.data.email)
  if (!confirmation.ok && confirmation.error === "rate_limited") {
    return {
      error: "Please wait a minute before requesting another confirmation email.",
    }
  }

  redirect(
    confirmation.ok ? "/check-email?confirmation=sent" : "/check-email?confirmation=failed"
  )
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const redirectTo = `${getAppUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  })

  return {
    success:
      "If an account exists for that email, we sent a link to reset your password.",
  }
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: "Your reset session expired. Request a new password reset link.",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/invoices")
}

export async function resendConfirmationAction(
  _prev: AuthActionState,
  // Required by useActionState; this action reads the session only.
  _formData: FormData
): Promise<AuthActionState> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "Sign in to resend the confirmation email." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed_at")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.email_confirmed_at) {
    return { success: "Your email is already confirmed." }
  }

  const confirmation = await issueAndSendConfirmation(supabase, user.email)

  if (confirmation.ok) {
    return { success: "Confirmation email sent. Check your inbox." }
  }

  if (confirmation.error === "rate_limited") {
    return {
      error: "Please wait a minute before requesting another confirmation email.",
    }
  }

  return {
    error: "Could not send the confirmation email. Try again in a moment.",
  }
}
