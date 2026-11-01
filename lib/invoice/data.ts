import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { decimalToCents } from "@/lib/invoice/format"
import type { InvoicePreviewModel, InvoiceParty } from "@/lib/invoice/model"
import type { InvoiceCurrency, InvoiceUnit } from "@/lib/invoice/schema"

export type DbClient = SupabaseClient

export type InvoiceRecord = {
  id: number
  user_id: string
  client_id: number
  invoice_number: string
  invoice_date: string
  due_date: string
  currency: InvoiceCurrency
  status: "not_paid" | "paid"
  paid_via: "stripe" | "manual" | null
  paid_at: string | null
  comments: string | null
  from_full_name: string | null
  from_company_name: string | null
  from_email: string | null
  from_address: string | null
  from_vat_id: string | null
  from_website: string | null
  to_full_name: string | null
  to_company_name: string | null
  to_email: string
  to_address: string | null
  to_vat_id: string | null
  subtotal: string
  tax: string
  total: string
  pdf_path: string | null
  send_status: "sent" | "failed" | null
  send_error: string | null
  last_sent_at: string | null
  created_at: string
}

export type InvoiceLineRecord = {
  id: number
  position: number
  description: string
  quantity: string
  unit: InvoiceUnit
  unit_price: string
  vat_rate: string
  line_subtotal: string
  line_tax: string
  line_total: string
}

export type ProfileRecord = {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  website: string | null
  email_confirmed_at: string | null
  stripe_account_id: string | null
  stripe_charges_enabled: boolean
}

export type ClientOption = {
  id: number
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  archived_at: string | null
}

const invoiceColumns =
  "id, user_id, client_id, invoice_number, invoice_date, due_date, currency, status, paid_via, paid_at, comments, from_full_name, from_company_name, from_email, from_address, from_vat_id, from_website, to_full_name, to_company_name, to_email, to_address, to_vat_id, subtotal, tax, total, pdf_path, send_status, send_error, last_sent_at, created_at"

const lineColumns =
  "id, position, description, quantity, unit, unit_price, vat_rate, line_subtotal, line_tax, line_total"

export function partyFromProfile(profile: ProfileRecord): InvoiceParty {
  return {
    fullName: profile.full_name,
    companyName: profile.company_name,
    email: profile.email,
    address: profile.address,
    vatId: profile.vat_id,
    website: profile.website,
  }
}

export function partyFromClient(client: {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
}): InvoiceParty {
  return {
    fullName: client.full_name,
    companyName: client.company_name,
    email: client.email,
    address: client.address,
    vatId: client.vat_id,
  }
}

export function previewFromInvoice(
  invoice: InvoiceRecord,
  lines: InvoiceLineRecord[]
): InvoicePreviewModel {
  return {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    currency: invoice.currency,
    comments: invoice.comments ?? "",
    from: {
      fullName: invoice.from_full_name,
      companyName: invoice.from_company_name,
      email: invoice.from_email,
      address: invoice.from_address,
      vatId: invoice.from_vat_id,
      website: invoice.from_website,
    },
    to: {
      fullName: invoice.to_full_name,
      companyName: invoice.to_company_name,
      email: invoice.to_email,
      address: invoice.to_address,
      vatId: invoice.to_vat_id,
    },
    lines: lines.map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      unit: line.unit,
      unitPrice: String(line.unit_price),
      vatRate: String(line.vat_rate),
      lineSubtotalCents: decimalToCents(line.line_subtotal),
      lineTaxCents: decimalToCents(line.line_tax),
      lineTotalCents: decimalToCents(line.line_total),
    })),
    subtotalCents: decimalToCents(invoice.subtotal),
    taxCents: decimalToCents(invoice.tax),
    totalCents: decimalToCents(invoice.total),
  }
}

export async function loadProfile(supabase: DbClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "full_name, company_name, email, address, vat_id, website, email_confirmed_at, stripe_account_id, stripe_charges_enabled"
    )
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as ProfileRecord | null
}

export async function loadInvoice(supabase: DbClient, invoiceId: number) {
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceColumns)
    .eq("id", invoiceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as InvoiceRecord | null
}

export async function loadLines(supabase: DbClient, invoiceId: number) {
  const { data, error } = await supabase
    .from("invoice_line_items")
    .select(lineColumns)
    .eq("invoice_id", invoiceId)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as InvoiceLineRecord[]
}

export async function loadActiveLink(supabase: DbClient, invoiceId: number) {
  const { data, error } = await supabase
    .from("payment_links")
    .select("id, stripe_checkout_session_id, url, amount, currency, active")
    .eq("invoice_id", invoiceId)
    .eq("active", true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as {
    id: number
    stripe_checkout_session_id: string
    url: string
    amount: string
    currency: string
    active: boolean
  } | null
}

export function senderIsReady(profile: ProfileRecord | null) {
  if (!profile) {
    return false
  }
  return Boolean(profile.full_name?.trim() || profile.company_name?.trim())
}
