import { z } from "zod"

import { clientDisplayName } from "@/lib/clients/display-name"
import { emptyToNull } from "@/lib/profile/schema"

export const clientFormSchema = z.object({
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
})

export type ClientFormInput = z.infer<typeof clientFormSchema>

export type ClientRow = {
  id: number
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export function clientRowToFormValues(row: {
  full_name: string | null
  company_name: string | null
  email: string | null
  address: string | null
  vat_id: string | null
}): ClientFormInput {
  return {
    full_name: row.full_name ?? "",
    company_name: row.company_name ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    vat_id: row.vat_id ?? "",
  }
}

export function clientFormToDatabase(fields: ClientFormInput) {
  const emailTrimmed = fields.email.trim()
  return {
    full_name: emptyToNull(fields.full_name),
    company_name: emptyToNull(fields.company_name),
    email: emailTrimmed === "" ? null : emailTrimmed,
    address: emptyToNull(fields.address),
    vat_id: emptyToNull(fields.vat_id),
  }
}

export type ClientListStatus = "all" | "active" | "archived"

export function parseClientListStatus(
  value: string | string[] | undefined
): ClientListStatus {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "active" || raw === "archived") {
    return raw
  }
  return "all"
}

export function parseClientSearchQuery(
  value: string | string[] | undefined
): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === "string" ? raw : ""
}

export function matchesClientSearch(row: ClientRow, query: string) {
  const needle = query.trim().toLowerCase()
  if (needle === "") {
    return true
  }

  const parts = [row.full_name, row.company_name, row.email]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase()

  return parts.includes(needle)
}

export function matchesClientStatusFilter(
  row: ClientRow,
  status: ClientListStatus
) {
  if (status === "all") {
    return true
  }
  if (status === "active") {
    return row.archived_at == null
  }
  return row.archived_at != null
}

export function sortClientsByDisplayName(a: ClientRow, b: ClientRow) {
  return clientDisplayName(a).localeCompare(clientDisplayName(b), undefined, {
    sensitivity: "base",
  })
}
