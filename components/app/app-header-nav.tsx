"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { appNavItems, isNavItemActive } from "@/lib/app/navigation"
import { cn } from "@/lib/utils"

type AppHeaderNavProps = {
  className?: string
}

export function AppHeaderNav({ className }: AppHeaderNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className={cn("flex items-center gap-1", className)}
    >
      {appNavItems.map(({ href, label }) => {
        const active = isNavItemActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-muted font-medium text-foreground"
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
