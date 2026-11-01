import { BrandMark } from "@/components/app/brand-mark"
import { cn } from "@/lib/utils"

const defaultMarketing = {
  headline: "Invoice clients in minutes",
  body: "Create PDF invoices, connect Stripe for payment links if you want, and email everything to your clients from one simple workspace.",
}

type AuthSplitShellProps = {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  headline?: string
  body?: string
  className?: string
}

export function AuthSplitShell({
  title,
  description,
  children,
  footer,
  headline = defaultMarketing.headline,
  body = defaultMarketing.body,
  className,
}: AuthSplitShellProps) {
  return (
    <div className={cn("flex min-h-svh flex-1 flex-col lg:flex-row", className)}>
      <div className="flex flex-1 flex-col bg-background">
        <div className="flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-10 xl:px-20">
          <div className="mb-10 shrink-0 lg:mb-12">
            <BrandMark />
          </div>
          <div className="flex flex-1 flex-col justify-center py-6 lg:py-10">
            <div className="mx-auto w-full max-w-md space-y-8">
              <div className="space-y-2">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="space-y-6">
                {children}
                {footer ? (
                  <div className="text-center text-sm text-muted-foreground">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden flex-1 flex-col justify-center border-border bg-muted/40 px-10 py-12 lg:flex lg:border-l lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-md space-y-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {headline}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  )
}
