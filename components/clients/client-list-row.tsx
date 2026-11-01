import Link from "next/link"

import { ClientRowMenu } from "@/components/clients/client-row-menu"
import { Badge } from "@/components/ui/badge"
import { clientDisplayName } from "@/lib/clients/display-name"
import type { ClientRow } from "@/lib/clients/schema"

type ClientListRowProps = {
  client: ClientRow
}

export function ClientListRow({ client }: ClientListRowProps) {
  const name = clientDisplayName(client)
  const email = client.email?.trim()
  const isArchived = client.archived_at != null

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 sm:gap-4 sm:px-5 sm:py-5">
      <Link
        href={`/clients/${client.id}`}
        className="min-w-0 flex-1 space-y-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold tracking-tight">{name}</p>
          {isArchived ? (
            <Badge variant="secondary" className="shrink-0">
              Archived
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {email || "No email yet"}
        </p>
      </Link>
      <ClientRowMenu
        clientId={client.id}
        displayName={name}
        isArchived={isArchived}
      />
    </div>
  )
}
