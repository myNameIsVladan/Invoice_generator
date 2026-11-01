import Link from "next/link"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { FormAlert } from "@/components/auth/form-alert"
import { ClientListRow } from "@/components/clients/client-list-row"
import { ClientsEmptyState } from "@/components/clients/clients-empty-state"
import { ClientsListToolbar } from "@/components/clients/clients-list-toolbar"
import { buttonVariants } from "@/components/ui/button"
import { clientsListHref } from "@/lib/clients/list-url"
import {
  matchesClientSearch,
  matchesClientStatusFilter,
  parseClientListStatus,
  parseClientSearchQuery,
  sortClientsByDisplayName,
  type ClientRow,
} from "@/lib/clients/schema"
import { cn } from "cn"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[] }>
}

export default async function ClientsPage({ searchParams }: PageProps) {
  await connection()
  const { q: qParam, status: statusParam } = await searchParams
  const query = parseClientSearchQuery(qParam)
  const status = parseClientListStatus(statusParam)

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, full_name, company_name, email, vat_id, archived_at, created_at, updated_at"
    )

  const allClients = (data ?? []) as ClientRow[]
  const filtered = allClients
    .filter((row) => matchesClientStatusFilter(row, status))
    .filter((row) => matchesClientSearch(row, query))
    .sort(sortClientsByDisplayName)

  const hasAnyClients = allClients.length > 0

  return (
    <div className="space-y-8">
      <div
        className={cn(
          "flex flex-col gap-4",
          hasAnyClients && "sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Keep who you invoice on file — all fields are optional — so
            you&apos;re ready when invoice creation launches.
          </p>
        </div>
        {hasAnyClients ? (
          <Link
            href="/clients/new"
            className={cn(
              buttonVariants({ size: "default" }),
              "h-auto min-h-9 rounded-full px-6 py-2.5 sm:shrink-0"
            )}
          >
            Add client
          </Link>
        ) : null}
      </div>

      {error ? (
        <FormAlert variant="destructive" title="Could not load clients">
          {error.message}
        </FormAlert>
      ) : null}

      {hasAnyClients ? (
        <div className="space-y-6">
          <ClientsListToolbar query={query} status={status} />

          {filtered.length === 0 ? (
            <ClientsEmptyState
              title="No clients match"
              description="Try a different search or switch the Active / Archived filter."
              actionHref={clientsListHref("all", "")}
              actionLabel="Clear filters"
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {filtered.map((client) => (
                <li key={client.id}>
                  <ClientListRow client={client} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ClientsEmptyState />
      )}
    </div>
  )
}
