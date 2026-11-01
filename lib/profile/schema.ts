import { z } from "zod"

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export const profileFormSchema = z.object({
  full_name: z.string(),
  company_name: z.string(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      { message: "Enter a valid email address" }
    ),
  address: z.string(),
  vat_id: z.string(),
  website: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidHttpUrl(value), {
      message: "Enter a valid website URL, including https://",
    }),
})

export type ProfileFormInput = z.infer<typeof profileFormSchema>

export function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** Reply-to shown in the form: saved override, otherwise the account email. */
export function replyToEmailForForm(
  profileEmail: string | null | undefined,
  accountEmail: string
) {
  const custom = profileEmail?.trim()
  return custom ? custom : accountEmail
}

/** Stored on profiles.email; null means use the account email when sending. */
export function replyToEmailForDatabase(
  formValue: string,
  accountEmail: string
) {
  const trimmed = formValue.trim()
  if (trimmed === "") {
    return null
  }
  if (trimmed.toLowerCase() === accountEmail.trim().toLowerCase()) {
    return null
  }
  return trimmed
}

export function profileRowToFormValues(
  row: {
    full_name: string | null
    company_name: string | null
    email: string | null
    address: string | null
    vat_id: string | null
    website: string | null
  },
  accountEmail: string
): ProfileFormInput {
  return {
    full_name: row.full_name ?? "",
    company_name: row.company_name ?? "",
    email: replyToEmailForForm(row.email, accountEmail),
    address: row.address ?? "",
    vat_id: row.vat_id ?? "",
    website: row.website ?? "",
  }
}
