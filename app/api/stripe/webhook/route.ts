import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { createAdminClient } from "@/utils/supabase/admin"
import { connectedAccountChargesEnabled, getStripe } from "@/lib/stripe/server"

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: insertError } = await admin.from("stripe_events").insert({
    id: event.id,
    event_type: event.type,
  })

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    await handleStripeEvent(event)
  } catch (error) {
    await admin.from("stripe_events").delete().eq("id", event.id)
    const message = error instanceof Error ? error.message : "Webhook failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleStripeEvent(event: Stripe.Event) {
  const admin = createAdminClient()

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account
    const chargesEnabled = await connectedAccountChargesEnabled(account.id)
    const { error } = await admin
      .from("profiles")
      .update({ stripe_charges_enabled: chargesEnabled })
      .eq("stripe_account_id", account.id)
    if (error) {
      throw new Error(error.message)
    }
    return
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed"
  ) {
    return
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (event.type === "checkout.session.async_payment_failed") {
    return
  }
  if (session.payment_status !== "paid") {
    return
  }

  const invoiceId = Number(session.metadata?.invoice_id)
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw new Error("Checkout session is missing an invoice id.")
  }

  const paidAt = new Date().toISOString()
  const { error: invoiceError } = await admin
    .from("invoices")
    .update({
      status: "paid",
      paid_via: "stripe",
      paid_at: paidAt,
    })
    .eq("id", invoiceId)
    .eq("status", "not_paid")

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  const { error: linkError } = await admin
    .from("payment_links")
    .update({
      active: false,
      deactivated_at: paidAt,
    })
    .eq("stripe_checkout_session_id", session.id)
    .eq("active", true)

  if (linkError) {
    throw new Error(linkError.message)
  }
}
