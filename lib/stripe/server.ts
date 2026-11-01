import "server-only"

import { headers } from "next/headers"
import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key)
  }
  return stripeClient
}

export async function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, "")
  }

  const headerList = await headers()
  const origin = headerList.get("origin")
  if (origin) {
    return origin.replace(/\/$/, "")
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  if (!host) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set")
  }
  const proto = headerList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function createExpressAccount(email: string, userId: string) {
  const stripe = getStripe()
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { user_id: userId },
  })
}

export async function createOnboardingLink(accountId: string, appUrl: string) {
  const stripe = getStripe()
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/settings/stripe/refresh`,
    return_url: `${appUrl}/settings/stripe/return`,
    type: "account_onboarding",
  })
}

export async function createInvoiceCheckout(input: {
  accountId: string
  invoiceId: number
  invoiceNumber: string
  amountCents: number
  currency: string
  appUrl: string
}) {
  const stripe = getStripe()
  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: String(input.invoiceId),
      metadata: { invoice_id: String(input.invoiceId) },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: `Invoice ${input.invoiceNumber}`,
            },
          },
        },
      ],
      success_url: `${input.appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.appUrl}/pay/cancelled`,
    },
    { stripeAccount: input.accountId }
  )
}

export async function expireCheckout(accountId: string, sessionId: string) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: accountId }
  )
  if (session.payment_status === "paid" || session.status === "complete") {
    throw new Error("This invoice was already paid through Stripe.")
  }
  if (session.status !== "expired") {
    await stripe.checkout.sessions.expire(sessionId, {}, { stripeAccount: accountId })
  }
}
