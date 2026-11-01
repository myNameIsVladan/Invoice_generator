import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"

import { ProfileForm } from "@/components/profile/profile-form"
import { FormAlert } from "@/components/auth/form-alert"
import { profileRowToFormValues } from "@/lib/profile/schema"
import { createClient } from "@/utils/supabase/server"

export const instant = false

export default async function ProfilePage() {
  await connection()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, email, address, vat_id, website")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Sender details used as the From block on every new invoice.
        </p>
      </div>

      {!profile ? (
        <FormAlert variant="destructive" title="Profile unavailable">
          We could not load your profile. Try signing out and back in. If this
          keeps happening, contact support.
        </FormAlert>
      ) : (
        <ProfileForm
          accountEmail={user.email}
          defaultValues={profileRowToFormValues(profile, user.email)}
        />
      )}
    </div>
  )
}
