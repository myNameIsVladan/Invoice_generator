"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  clientFormSchema,
  clientFormToDatabase,
} from "@/lib/clients/schema"
import { createClient } from "@/utils/supabase/server"

export type ClientActionState = {
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
  success?: string
}

function parseClientId(raw: FormDataEntryValue | null) {
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

  if (!user) {
    return { supabase: null as never, user: null as never }
  }

  return { supabase, user }
}

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const parsed = clientFormSchema.safeParse({
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name"),
    email: formData.get("email"),
    address: formData.get("address"),
    vat_id: formData.get("vat_id"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return { error: "Sign in to add a client." }
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      ...clientFormToDatabase(parsed.data),
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/clients", "layout")
  redirect(`/clients/${data.id}`)
}

const inlineClientSchema = clientFormSchema.superRefine((value, ctx) => {
  if (value.email.trim() === "") {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Enter an email address",
    })
  }
})

export async function createClientInlineAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState & { clientId?: number }> {
  const parsed = inlineClientSchema.safeParse({
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name"),
    email: formData.get("email"),
    address: formData.get("address"),
    vat_id: formData.get("vat_id"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return { error: "Sign in to add a client." }
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      ...clientFormToDatabase(parsed.data),
    })
    .select("id")
    .single()

  if (error || !data) {
    return { error: error?.message ?? "The client could not be saved." }
  }

  revalidatePath("/clients", "layout")
  return { success: "Client added.", clientId: data.id }
}

export async function updateClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const clientId = parseClientId(formData.get("client_id"))
  if (clientId == null) {
    return { error: "Client not found." }
  }

  const parsed = clientFormSchema.safeParse({
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name"),
    email: formData.get("email"),
    address: formData.get("address"),
    vat_id: formData.get("vat_id"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return { error: "Sign in to update this client." }
  }

  const { data, error } = await supabase
    .from("clients")
    .update(clientFormToDatabase(parsed.data))
    .eq("id", clientId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Client not found." }
  }

  revalidatePath("/clients", "layout")
  revalidatePath(`/clients/${clientId}`)

  return { success: "Client saved." }
}

export async function archiveClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const clientId = parseClientId(formData.get("client_id"))
  if (clientId == null) {
    return { error: "Client not found." }
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return { error: "Sign in to archive this client." }
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Client not found." }
  }

  revalidatePath("/clients", "layout")
  revalidatePath(`/clients/${clientId}`)

  return { success: "archived" }
}

export async function restoreClientAction(
  _prev: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const clientId = parseClientId(formData.get("client_id"))
  if (clientId == null) {
    return { error: "Client not found." }
  }

  const { supabase, user } = await requireUser()
  if (!user) {
    return { error: "Sign in to restore this client." }
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ archived_at: null })
    .eq("id", clientId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Client not found." }
  }

  revalidatePath("/clients", "layout")
  revalidatePath(`/clients/${clientId}`)

  return { success: "restored" }
}
