import { BrandMark } from "@/components/app/brand-mark"
import { AppAccountMenu } from "@/components/app/app-account-menu"
import { AppHeaderNav } from "@/components/app/app-header-nav"

type AppHeaderProps = {
  email: string
  displayName?: string | null
}

export function AppHeader({ email, displayName }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:gap-8">
        <div className="min-w-0 shrink-0 pr-1 sm:pr-2">
          <BrandMark href="/invoices" size="md" />
        </div>
        {/* Nav hidden below sm; home remains via brand link. */}
        <AppHeaderNav className="hidden min-w-0 flex-1 sm:ml-2 sm:flex md:ml-4" />
        <div className="ml-auto shrink-0">
          <AppAccountMenu email={email} displayName={displayName} />
        </div>
      </div>
    </header>
  )
}
