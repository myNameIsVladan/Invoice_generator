import { randomBytes } from "crypto"

import { sendEmail } from "@/utils/email/send"

import { getAppUrl } from "./urls"

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000

export function generateConfirmationToken() {
  return randomBytes(32).toString("hex")
}

export function confirmationExpiresAt(nowMs: number) {
  return new Date(nowMs + CONFIRMATION_TTL_MS)
}

export async function sendConfirmationEmail(to: string, token: string) {
  const confirmUrl = `${getAppUrl()}/auth/confirm?token=${encodeURIComponent(token)}`

  await sendEmail({
    to,
    subject: "Confirm your email for Invoice Generator",
    html: `<p>Finish registration by confirming your email:</p><p><a href="${confirmUrl}">Confirm email</a></p><p>This link expires in 24 hours.</p>`,
    text: `Finish registration by confirming your email:\n\n${confirmUrl}\n\nThis link expires in 24 hours.`,
  })
}
