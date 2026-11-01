"use client"

import Link from "next/link"
import { SettingsIcon } from "lucide-react"

import { signOutAction } from "@/app/actions/sign-out"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type AppAccountMenuProps = {
  email: string
  displayName?: string | null
  className?: string
}

export function accountInitial(email: string, displayName?: string | null) {
  const source = displayName?.trim() || email.split("@")[0] || email
  const letter = source.match(/\p{L}/u)?.[0] ?? source.match(/[a-zA-Z0-9]/)?.[0]
  return (letter ?? "?").toUpperCase()
}

export function AppAccountMenu({
  email,
  displayName,
  className,
}: AppAccountMenuProps) {
  const initial = accountInitial(email, displayName)
  const name = displayName?.trim()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-full", className)}
            aria-label={name ? `Account menu for ${name}` : `Account menu for ${email}`}
          />
        }
      >
        <Avatar>
          <AvatarFallback className="bg-primary/15 font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 font-normal">
            {name ? (
              <>
                <p className="truncate text-sm font-medium text-foreground">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </>
            ) : (
              <p className="truncate text-sm text-foreground">{email}</p>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <SettingsIcon />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="h-8 w-full justify-start px-1.5 font-normal"
          >
            Sign out
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
