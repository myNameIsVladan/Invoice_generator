import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

type ClientsEmptyStateProps = {
  title?: string
  description?: string
  actionHref?: string
  actionLabel?: string
}

export function ClientsEmptyState({
  title = "No clients yet",
  description = "Add a client when you want them available on an invoice.",
  actionHref = "/clients/new",
  actionLabel = "Add client",
}: ClientsEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-6 py-16 text-center sm:py-20">
        <div className="max-w-md space-y-2">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-balance text-muted-foreground">
            {description}
          </p>
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 min-w-36 rounded-full px-8 text-base"
            )}
          >
            {actionLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
