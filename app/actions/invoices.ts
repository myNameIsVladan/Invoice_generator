"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { ZodError } from "zod"

import { invoiceFormSchema, type InvoiceFormValues } from "@/lib/invoice/schema"
import {
  deleteInvoice,
  editInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  resendInvoice,
  saveInvoice,
} from "@/lib/invoice/service"
import { getAppUrl } from "@/lib/stripe/server"
import { createClient } from "@/utils/supabase/server"

export type InvoiceActionState = {
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
  invoiceId?: number
  sendStatus?: "sent" | "failed"
  success?: "paid" | "unpaid" | "deleted" | "resent"
}

function zodFieldErrors(error: ZodError) {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form"
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }
  return fieldErrors
}

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

function parseInvoiceId(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return null
  }
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

async function requireUser() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { supabase: null, user: null }
  }

  return { supabase, user }
}

function parsePayload(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") {
    return { error: "The invoice form could not be read." } as const
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { error: "The invoice form could not be read." } as const
  }
  const parsed = invoiceFormSchema.safeParse(json)
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) } as const
  }
  return { values: parsed.data } as const
}

export async function createInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const parsed = parsePayload(formData.get("payload"))
  if ("error" in parsed && parsed.error) {
    return { error: parsed.error }
  }
  if ("fieldErrors" in parsed && parsed.fieldErrors) {
    return { fieldErrors: parsed.fieldErrors }
  }
  if (!("values" in parsed)) {
    return { error: "The invoice form could not be read." }
  }

  const { supabase, user } = await requireUser()
  if (!supabase || !user?.email) {
    return { error: "Sign in to create an invoice." }
  }

  try {
    const invoiceId = await saveInvoice({
      supabase,
      userId: user.id,
      values: parsed.values as InvoiceFormValues,
    })

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    redirect(`/invoices/${invoiceId}`)
  } catch (error) {
    rethrowRedirect(error)
    return {
      error: error instanceof Error ? error.message : "The invoice could not be created.",
    }
  }
}

export async function editInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = parseInvoiceId(formData.get("invoice_id"))
  if (invoiceId == null) {
    return { error: "Invoice not found." }
  }

  const parsed = parsePayload(formData.get("payload"))
  if ("error" in parsed && parsed.error) {
    return { error: parsed.error }
  }
  if ("fieldErrors" in parsed && parsed.fieldErrors) {
    return { fieldErrors: parsed.fieldErrors }
  }
  if (!("values" in parsed)) {
    return { error: "The invoice form could not be read." }
  }

  const { supabase, user } = await requireUser()
  if (!supabase || !user) {
    return { error: "Sign in to edit this invoice." }
  }

  try {
    await editInvoice({
      supabase,
      userId: user.id,
      invoiceId,
      values: parsed.values as InvoiceFormValues,
      appUrl: await getAppUrl(),
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The invoice could not be saved.",
    }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  redirect(`/invoices/${invoiceId}?resend=1`)
}

export async function resendInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = parseInvoiceId(formData.get("invoice_id"))
  if (invoiceId == null) {
    return { error: "Invoice not found." }
  }
  const note = typeof formData.get("note") === "string" ? String(formData.get("note")) : ""

  const { supabase, user } = await requireUser()
  if (!supabase || !user?.email) {
    return { error: "Sign in to resend this invoice." }
  }

  try {
    const result = await resendInvoice({
      supabase,
      userId: user.id,
      accountEmail: user.email,
      invoiceId,
      note,
      appUrl: await getAppUrl(),
    })
    if (result.kind === "onboarding") {
      redirect(result.url)
    }
    if (result.kind === "failed") {
      revalidatePath(`/invoices/${invoiceId}`)
      return {
        error: result.message,
        invoiceId,
        sendStatus: "failed",
      }
    }
  } catch (error) {
    rethrowRedirect(error)
    revalidatePath(`/invoices/${invoiceId}`)
    return {
      error: error instanceof Error ? error.message : "The email could not be sent.",
      invoiceId,
      sendStatus: "failed",
    }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  return { invoiceId, sendStatus: "sent", success: "resent" }
}

export async function markInvoicePaidAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = parseInvoiceId(formData.get("invoice_id"))
  if (invoiceId == null) {
    return { error: "Invoice not found." }
  }
  const { supabase, user } = await requireUser()
  if (!supabase || !user) {
    return { error: "Sign in to update this invoice." }
  }

  try {
    await markInvoicePaid({ supabase, userId: user.id, invoiceId })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The invoice could not be marked paid.",
    }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  return { invoiceId, success: "paid" }
}

export async function markInvoiceUnpaidAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = parseInvoiceId(formData.get("invoice_id"))
  if (invoiceId == null) {
    return { error: "Invoice not found." }
  }
  const { supabase, user } = await requireUser()
  if (!supabase || !user) {
    return { error: "Sign in to update this invoice." }
  }

  try {
    await markInvoiceUnpaid({
      supabase,
      userId: user.id,
      invoiceId,
      appUrl: await getAppUrl(),
    })
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "The invoice could not be set back to unpaid.",
    }
  }

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
  return { invoiceId, success: "unpaid" }
}

export async function deleteInvoiceAction(
  _prev: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const invoiceId = parseInvoiceId(formData.get("invoice_id"))
  if (invoiceId == null) {
    return { error: "Invoice not found." }
  }
  const { supabase, user } = await requireUser()
  if (!supabase || !user) {
    return { error: "Sign in to delete this invoice." }
  }

  try {
    await deleteInvoice({ supabase, userId: user.id, invoiceId })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The invoice could not be deleted.",
    }
  }

  revalidatePath("/invoices")
  const stay = formData.get("stay") === "1"
  if (!stay) {
    redirect("/invoices?deleted=1")
  }
  return { success: "deleted" }
}
