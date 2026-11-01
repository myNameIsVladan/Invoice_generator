"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import {
  emptyToNull,
  profileFormSchema,
  replyToEmailForDatabase,
} from "@/lib/profile/schema"
import { createClient } from "@/utils/supabase/server"

export type ProfileActionState = {
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
  success?: string
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const parsed = profileFormSchema.safeParse({
    full_name: formData.get("full_name"),
    company_name: formData.get("company_name"),
    email: formData.get("email"),
    address: formData.get("address"),
    vat_id: formData.get("vat_id"),
    website: formData.get("website"),
  })

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "Sign in to update your profile." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: emptyToNull(parsed.data.full_name),
      company_name: emptyToNull(parsed.data.company_name),
      email: replyToEmailForDatabase(parsed.data.email, user.email),
      address: emptyToNull(parsed.data.address),
      vat_id: emptyToNull(parsed.data.vat_id),
      website: emptyToNull(parsed.data.website),
    })
    .eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile", "layout")

  return { success: "Profile saved." }
}
