import type { SupabaseClient } from "@supabase/supabase-js"

import {
  confirmationExpiresAt,
  generateConfirmationToken,
  sendConfirmationEmail,
} from "./confirmation-email"

type IssueResult =
  | { ok: true }
  | { ok: false; error: "rate_limited" | "send_failed" | "rpc_failed" }

export async function issueAndSendConfirmation(
  supabase: SupabaseClient,
  email: string
): Promise<IssueResult> {
  const token = generateConfirmationToken()
  const expiresAt = confirmationExpiresAt(new Date().getTime())

  const { error: rpcError } = await supabase.rpc("issue_email_confirmation", {
    p_token: token,
    p_expires_at: expiresAt.toISOString(),
  })

  if (rpcError) {
    if (rpcError.message.includes("sent recently")) {
      return { ok: false, error: "rate_limited" }
    }
    return { ok: false, error: "rpc_failed" }
  }

  try {
    await sendConfirmationEmail(email, token)
  } catch {
    return { ok: false, error: "send_failed" }
  }

  return { ok: true }
}
