import "server-only"

import { invoiceSenderName, buildInvoiceEmail } from "@/lib/invoice/email"
import { invoicePdfLocation } from "@/lib/invoice/filename"
import { decimalToCents } from "@/lib/invoice/format"
import { renderInvoicePdf } from "@/lib/invoice/pdf"
import type { InvoiceFormValues } from "@/lib/invoice/schema"
import {
  loadActiveLink,
  loadInvoice,
  loadLines,
  loadProfile,
  previewFromInvoice,
  senderIsReady,
  type DbClient,
  type InvoiceRecord,
} from "@/lib/invoice/data"
import {
  createExpressAccount,
  createInvoiceCheckout,
  createOnboardingLink,
  expireCheckout,
} from "@/lib/stripe/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { sendEmail } from "@/utils/email/send"

export type SendResult =
  | { kind: "onboarding"; url: string }
  | { kind: "sent"; invoiceId: number }
  | { kind: "failed"; invoiceId: number; message: string }

type StripeIntent =
  | { intent: "profile" }
  | { intent: "send"; invoice_id: number; note: string }

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

async function deleteHold(supabase: DbClient, userId: string) {
  await supabase.from("invoice_holds").delete().eq("user_id", userId)
}

async function saveStripeIntent(supabase: DbClient, userId: string, intent: StripeIntent) {
  const { error } = await supabase.from("invoice_holds").upsert(
    {
      user_id: userId,
      payload: intent,
    },
    { onConflict: "user_id" }
  )
  if (error) {
    throw new Error(error.message)
  }
}

export async function beginStripeOnboarding(input: {
  supabase: DbClient
  userId: string
  accountEmail: string
  appUrl: string
  intent: StripeIntent
}) {
  const profile = await loadProfile(input.supabase, input.userId)
  const accountId = await connectedAccountId(
    profile?.stripe_account_id ?? null,
    input.userId,
    input.accountEmail
  )
  await saveStripeIntent(input.supabase, input.userId, input.intent)
  const link = await createOnboardingLink(accountId, input.appUrl)
  return link.url
}

async function connectedAccountId(
  profileAccountId: string | null,
  userId: string,
  email: string
) {
  if (profileAccountId) {
    return profileAccountId
  }

  const account = await createExpressAccount(email, userId)
  const admin = createAdminClient()
  const { error } = await admin
    .from("profiles")
    .update({ stripe_account_id: account.id })
    .eq("id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return account.id
}

async function compensateFailedCreate(
  supabase: DbClient,
  input: {
    userId: string
    invoiceId: number
    accountId: string | null
    sessionId: string | null
    pdfPath: string | null
  }
) {
  if (input.sessionId && input.accountId) {
    try {
      await expireCheckout(input.accountId, input.sessionId)
    } catch {
      // The session may already be gone. The invoice row still has to be removed.
    }
  }

  const { error } = await supabase.rpc("release_failed_invoice", {
    p_invoice_id: input.invoiceId,
  })
  if (error) {
    throw new Error(error.message)
  }

  if (input.pdfPath) {
    await supabase.storage.from("invoices").remove([input.pdfPath])
  }

  await deleteHold(supabase, input.userId)
}

async function recordSend(
  supabase: DbClient,
  input: {
    invoiceId: number
    userId: string
    note: string
    status: "sent" | "failed"
    resendEmailId?: string | null
    error?: string | null
  }
) {
  const { error: sendError } = await supabase.from("invoice_sends").insert({
    invoice_id: input.invoiceId,
    user_id: input.userId,
    note: input.note.trim() ? input.note.trim() : null,
    status: input.status,
    resend_email_id: input.resendEmailId ?? null,
    error: input.error ?? null,
  })

  if (sendError) {
    throw new Error(sendError.message)
  }

  const sendUpdate: {
    send_status: "sent" | "failed"
    send_error: string | null
    last_sent_at?: string
  } = {
    send_status: input.status,
    send_error:
      input.status === "failed"
        ? input.error ?? "The email could not be sent."
        : null,
  }
  if (input.status === "sent") {
    sendUpdate.last_sent_at = new Date().toISOString()
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update(sendUpdate)
    .eq("id", input.invoiceId)

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }
}

async function deliverInvoice(input: {
  supabase: DbClient
  userId: string
  accountEmail: string
  invoice: InvoiceRecord
  note: string
  paymentUrl: string
  pdf: Buffer
  filename: string
}) {
  const profile = await loadProfile(input.supabase, input.userId)
  const replyTo = profile?.email?.trim() || input.accountEmail
  const senderName = invoiceSenderName(
    input.invoice.from_company_name,
    input.invoice.from_full_name
  )
  const message = buildInvoiceEmail({
    invoiceNumber: input.invoice.invoice_number,
    senderName,
    note: input.note,
    paymentUrl: input.paymentUrl,
  })

  try {
    const sent = await sendEmail({
      to: input.invoice.to_email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo,
      attachments: [
        {
          filename: input.filename,
          content: input.pdf,
          contentType: "application/pdf",
        },
      ],
    })
    await recordSend(input.supabase, {
      invoiceId: input.invoice.id,
      userId: input.userId,
      note: input.note,
      status: "sent",
      resendEmailId: sent?.id ?? null,
    })
  } catch (error) {
    const reason = messageFrom(error)
    await recordSend(input.supabase, {
      invoiceId: input.invoice.id,
      userId: input.userId,
      note: input.note,
      status: "failed",
      error: reason,
    })
    throw new Error(reason)
  }
}

async function storePdf(
  supabase: DbClient,
  invoice: InvoiceRecord,
  pdf: Buffer
) {
  const location = invoicePdfLocation({
    userId: invoice.user_id,
    invoiceId: invoice.id,
    invoiceDate: invoice.invoice_date,
    invoiceNumber: invoice.invoice_number,
  })
  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(location.path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: pathError } = await supabase
    .from("invoices")
    .update({ pdf_path: location.path })
    .eq("id", invoice.id)

  if (pathError) {
    await supabase.storage.from("invoices").remove([location.path])
    throw new Error(pathError.message)
  }

  return location
}

async function loadBillableClient(supabase: DbClient, userId: string, clientId: number) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, company_name, email, address, vat_id, archived_at")
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error("Choose a client.")
  }
  if (data.archived_at) {
    throw new Error("Choose an active client.")
  }
  if (!data.email?.trim()) {
    throw new Error("The client needs an email.")
  }

  return data
}

export async function saveInvoice(input: {
  supabase: DbClient
  userId: string
  values: InvoiceFormValues
}) {
  const profile = await loadProfile(input.supabase, input.userId)
  if (!profile?.email_confirmed_at) {
    throw new Error("Confirm your email before creating an invoice.")
  }
  if (!senderIsReady(profile)) {
    throw new Error("Add a full name or a company name to your profile.")
  }

  const clientId = Number(input.values.client_id)
  await loadBillableClient(input.supabase, input.userId, clientId)

  let invoiceId: number | null = null
  let pdfPath: string | null = null

  try {
    const { data, error } = await input.supabase.rpc("create_invoice", {
      p_client_id: clientId,
      p_invoice_date: input.values.invoice_date,
      p_due_date: input.values.due_date,
      p_currency: input.values.currency,
      p_comments: input.values.comments.trim() ? input.values.comments.trim() : null,
      p_lines: input.values.lines.map((line) => ({
        description: line.description.trim(),
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unit_price,
        vat_rate: line.vat_rate,
      })),
    })

    if (error || !data) {
      throw new Error(error?.message ?? "The invoice could not be created.")
    }

    const created = (Array.isArray(data) ? data[0] : data) as InvoiceRecord
    if (!created?.id) {
      throw new Error("The invoice could not be created.")
    }
    invoiceId = created.id

    const lines = await loadLines(input.supabase, created.id)
    const pdf = await renderInvoicePdf(previewFromInvoice(created, lines))
    const stored = await storePdf(input.supabase, created, pdf)
    pdfPath = stored.path
    return created.id
  } catch (error) {
    if (invoiceId) {
      try {
        await compensateFailedCreate(input.supabase, {
          userId: input.userId,
          invoiceId,
          accountId: null,
          sessionId: null,
          pdfPath,
        })
      } catch (compensateError) {
        throw new Error(
          `${messageFrom(error)} The unfinished invoice could not be removed: ${messageFrom(compensateError)}`
        )
      }
    }
    throw error instanceof Error ? error : new Error(messageFrom(error))
  }
}

export async function sendInvoice(input: {
  supabase: DbClient
  userId: string
  accountEmail: string
  invoiceId: number
  note: string
  appUrl: string
}): Promise<SendResult> {
  const invoice = await loadInvoice(input.supabase, input.invoiceId)
  if (!invoice) {
    throw new Error("Invoice not found.")
  }
  if (invoice.status !== "not_paid" || invoice.paid_via) {
    throw new Error("Only an unpaid invoice can be sent.")
  }

  const profile = await loadProfile(input.supabase, input.userId)
  if (!profile?.stripe_charges_enabled || !profile.stripe_account_id) {
    const url = await beginStripeOnboarding({
      supabase: input.supabase,
      userId: input.userId,
      accountEmail: input.accountEmail,
      appUrl: input.appUrl,
      intent: {
        intent: "send",
        invoice_id: invoice.id,
        note: input.note,
      },
    })
    return { kind: "onboarding", url }
  }

  let link = await loadActiveLink(input.supabase, invoice.id)
  if (!link) {
    await replacePaymentLink(input.supabase, {
      userId: input.userId,
      invoice,
      accountId: profile.stripe_account_id,
      appUrl: input.appUrl,
    })
    link = await loadActiveLink(input.supabase, invoice.id)
  }
  if (!link) {
    throw new Error("Stripe did not return a payment link.")
  }

  const lines = await loadLines(input.supabase, invoice.id)
  const pdf = await renderInvoicePdf(previewFromInvoice(invoice, lines))
  const stored = await storePdf(input.supabase, invoice, pdf)
  if (invoice.pdf_path && invoice.pdf_path !== stored.path) {
    await input.supabase.storage.from("invoices").remove([invoice.pdf_path])
  }

  try {
    await deliverInvoice({
      supabase: input.supabase,
      userId: input.userId,
      accountEmail: input.accountEmail,
      invoice,
      note: input.note,
      paymentUrl: link.url,
      pdf,
      filename: stored.basename,
    })
    await deleteHold(input.supabase, input.userId)
    return { kind: "sent", invoiceId: invoice.id }
  } catch (error) {
    return {
      kind: "failed",
      invoiceId: invoice.id,
      message: messageFrom(error),
    }
  }
}

async function replaceLines(
  supabase: DbClient,
  invoiceId: number,
  userId: string,
  lines: InvoiceFormValues["lines"]
) {
  const existing = await loadLines(supabase, invoiceId)
  for (const line of existing) {
    const { error } = await supabase
      .from("invoice_line_items")
      .update({ position: line.position + 10000 })
      .eq("id", line.id)
    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: insertError } = await supabase.from("invoice_line_items").insert(
    lines.map((line, index) => ({
      invoice_id: invoiceId,
      user_id: userId,
      position: index + 1,
      description: line.description.trim(),
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unit_price,
      vat_rate: line.vat_rate,
      line_subtotal: 0,
      line_tax: 0,
      line_total: 0,
    }))
  )
  if (insertError) {
    throw new Error(insertError.message)
  }

  if (existing.length > 0) {
    const { error: deleteError } = await supabase
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoiceId)
      .gt("position", 10000)
    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }
}

async function replacePaymentLink(
  supabase: DbClient,
  input: {
    userId: string
    invoice: InvoiceRecord
    accountId: string
    appUrl: string
  }
) {
  const current = await loadActiveLink(supabase, input.invoice.id)
  const session = await createInvoiceCheckout({
    accountId: input.accountId,
    invoiceId: input.invoice.id,
    invoiceNumber: input.invoice.invoice_number,
    amountCents: decimalToCents(input.invoice.total),
    currency: input.invoice.currency,
    appUrl: input.appUrl,
  })
  if (!session.url) {
    throw new Error("Stripe did not return a payment link.")
  }

  if (current) {
    const { error } = await supabase
      .from("payment_links")
      .update({
        active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .eq("active", true)
    if (error) {
      await expireCheckout(input.accountId, session.id).catch(() => undefined)
      throw new Error(error.message)
    }
  }

  const { error: insertError } = await supabase.from("payment_links").insert({
    invoice_id: input.invoice.id,
    user_id: input.userId,
    stripe_checkout_session_id: session.id,
    url: session.url,
    amount: input.invoice.total,
    currency: input.invoice.currency,
    active: true,
  })

  if (insertError) {
    if (current) {
      await supabase
        .from("payment_links")
        .update({ active: true, deactivated_at: null })
        .eq("id", current.id)
    }
    await expireCheckout(input.accountId, session.id).catch(() => undefined)
    throw new Error(insertError.message)
  }

  if (!current) {
    return
  }

  try {
    await expireCheckout(input.accountId, current.stripe_checkout_session_id)
  } catch (error) {
    await supabase
      .from("payment_links")
      .update({
        active: false,
        deactivated_at: new Date().toISOString(),
      })
      .eq("stripe_checkout_session_id", session.id)
    await supabase
      .from("payment_links")
      .update({ active: true, deactivated_at: null })
      .eq("id", current.id)
    throw error
  }
}

export async function editInvoice(input: {
  supabase: DbClient
  userId: string
  invoiceId: number
  values: InvoiceFormValues
  appUrl: string
}) {
  const original = await loadInvoice(input.supabase, input.invoiceId)
  if (!original || original.status !== "not_paid" || original.paid_via) {
    throw new Error("Only an unpaid invoice can be edited.")
  }

  const profile = await loadProfile(input.supabase, input.userId)
  const nextClientId = Number(input.values.client_id)
  const clientChanged = nextClientId !== original.client_id
  const nextClient = clientChanged
    ? await loadBillableClient(input.supabase, input.userId, nextClientId)
    : null

  await replaceLines(
    input.supabase,
    original.id,
    input.userId,
    input.values.lines
  )

  const patch: Record<string, string | number | null> = {
    invoice_date: input.values.invoice_date,
    due_date: input.values.due_date,
    currency: input.values.currency,
    comments: input.values.comments.trim() ? input.values.comments.trim() : null,
  }
  if (nextClient) {
    patch.client_id = nextClient.id
    patch.to_full_name = nextClient.full_name
    patch.to_company_name = nextClient.company_name
    patch.to_email = nextClient.email?.trim() ?? null
    patch.to_address = nextClient.address
    patch.to_vat_id = nextClient.vat_id
  }

  const { error: updateError } = await input.supabase
    .from("invoices")
    .update(patch)
    .eq("id", original.id)
  if (updateError) {
    throw new Error(updateError.message)
  }

  const updated = await loadInvoice(input.supabase, original.id)
  const lines = await loadLines(input.supabase, original.id)
  if (!updated) {
    throw new Error("Invoice not found.")
  }

  const moneyChanged =
    clientChanged ||
    original.currency !== updated.currency ||
    decimalToCents(original.total) !== decimalToCents(updated.total)

  const existingLink = await loadActiveLink(input.supabase, updated.id)
  if (moneyChanged && existingLink) {
    if (!profile?.stripe_account_id || !profile.stripe_charges_enabled) {
      throw new Error("Connect Stripe before changing an invoice that already has a payment link.")
    }
    await replacePaymentLink(input.supabase, {
      userId: input.userId,
      invoice: updated,
      accountId: profile.stripe_account_id,
      appUrl: input.appUrl,
    })
  }

  const pdf = await renderInvoicePdf(previewFromInvoice(updated, lines))
  const stored = await storePdf(input.supabase, updated, pdf)
  if (original.pdf_path && original.pdf_path !== stored.path) {
    await input.supabase.storage.from("invoices").remove([original.pdf_path])
  }
}

export async function resendInvoice(input: {
  supabase: DbClient
  userId: string
  accountEmail: string
  invoiceId: number
  note: string
  appUrl: string
}) {
  return sendInvoice(input)
}

async function deactivateLink(supabase: DbClient, linkId: number) {
  const { error } = await supabase
    .from("payment_links")
    .update({
      active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", linkId)
    .eq("active", true)
  if (error) {
    throw new Error(error.message)
  }
}

export async function markInvoicePaid(input: {
  supabase: DbClient
  userId: string
  invoiceId: number
}) {
  const invoice = await loadInvoice(input.supabase, input.invoiceId)
  if (!invoice || invoice.status !== "not_paid") {
    throw new Error("Only an unpaid invoice can be marked paid.")
  }

  const profile = await loadProfile(input.supabase, input.userId)
  const link = await loadActiveLink(input.supabase, invoice.id)
  if (link && profile?.stripe_account_id) {
    await expireCheckout(profile.stripe_account_id, link.stripe_checkout_session_id)
    await deactivateLink(input.supabase, link.id)
  } else if (link) {
    await deactivateLink(input.supabase, link.id)
  }

  const { error } = await input.supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_via: "manual",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .eq("status", "not_paid")

  if (error) {
    throw new Error(error.message)
  }
}

export async function markInvoiceUnpaid(input: {
  supabase: DbClient
  userId: string
  invoiceId: number
  appUrl: string
}) {
  const invoice = await loadInvoice(input.supabase, input.invoiceId)
  if (!invoice || invoice.paid_via !== "manual") {
    throw new Error("Only an invoice you marked paid can be set back to unpaid.")
  }

  const profile = await loadProfile(input.supabase, input.userId)
  if (!profile?.stripe_account_id) {
    throw new Error("Stripe is not connected to this account.")
  }

  const session = await createInvoiceCheckout({
    accountId: profile.stripe_account_id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amountCents: decimalToCents(invoice.total),
    currency: invoice.currency,
    appUrl: input.appUrl,
  })
  if (!session.url) {
    throw new Error("Stripe did not return a payment link.")
  }

  const { error: statusError } = await input.supabase
    .from("invoices")
    .update({
      status: "not_paid",
      paid_via: null,
      paid_at: null,
    })
    .eq("id", invoice.id)
    .eq("paid_via", "manual")

  if (statusError) {
    await expireCheckout(profile.stripe_account_id, session.id).catch(() => undefined)
    throw new Error(statusError.message)
  }

  const { error: linkError } = await input.supabase.from("payment_links").insert({
    invoice_id: invoice.id,
    user_id: input.userId,
    stripe_checkout_session_id: session.id,
    url: session.url,
    amount: invoice.total,
    currency: invoice.currency,
    active: true,
  })

  if (linkError) {
    await input.supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_via: "manual",
        paid_at: invoice.paid_at,
      })
      .eq("id", invoice.id)
    await expireCheckout(profile.stripe_account_id, session.id).catch(() => undefined)
    throw new Error(linkError.message)
  }
}

export async function deleteInvoice(input: {
  supabase: DbClient
  userId: string
  invoiceId: number
}) {
  const invoice = await loadInvoice(input.supabase, input.invoiceId)
  if (!invoice || invoice.status !== "not_paid" || invoice.paid_via) {
    throw new Error("Only an unpaid invoice can be deleted.")
  }

  const profile = await loadProfile(input.supabase, input.userId)
  const link = await loadActiveLink(input.supabase, invoice.id)
  if (link && profile?.stripe_account_id) {
    await expireCheckout(profile.stripe_account_id, link.stripe_checkout_session_id)
  }

  const { error } = await input.supabase.from("invoices").delete().eq("id", invoice.id)
  if (error) {
    throw new Error(error.message)
  }

  if (invoice.pdf_path) {
    await input.supabase.storage.from("invoices").remove([invoice.pdf_path])
  }
}
