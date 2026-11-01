import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { notFound } from "next/navigation"

import { ClientEditForm } from "@/components/clients/client-form-visit"
import { ClientStatusActions } from "@/components/clients/client-status-actions"
import { Badge } from "@/components/ui/badge"
import { clientDisplayName } from "@/lib/clients/display-name"
import { clientRowToFormValues } from "@/lib/clients/schema"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  params: Promise<{ id: string }>
}

function parseRouteClientId(raw: string) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

export default async function EditClientPage({ params }: PageProps) {
  await connection()
  const { id: idParam } = await params
  const clientId = parseRouteClientId(idParam)
  if (clientId == null) {
    notFound()
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, full_name, company_name, email, address, vat_id, archived_at, created_at, updated_at"
    )
    .eq("id", clientId)
    .maybeSingle()

  if (!client) {
    notFound()
  }

  const displayName = clientDisplayName(client)
  const isArchived = client.archived_at != null

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          {isArchived ? <Badge variant="secondary">Archived</Badge> : null}
        </div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        >
          <ArrowLeftIcon className="size-3.5 shrink-0" aria-hidden />
          Back to clients
        </Link>
      </div>

      <ClientEditForm
        clientId={client.id}
        defaultValues={clientRowToFormValues(client)}
      />

      <ClientStatusActions
        clientId={client.id}
        displayName={displayName}
        isArchived={isArchived}
      />
    </div>
  )
}
