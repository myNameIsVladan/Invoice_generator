import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  href?: string
  /** `lg` for auth; `md` fits the app header bar. */
  size?: "md" | "lg"
}

export function BrandMark({
  className,
  href,
  size = "lg",
}: BrandMarkProps) {
  const label = (
    <span
      className={cn(
        "inline-block max-w-full truncate border-primary font-heading leading-none tracking-tight text-foreground",
        size === "lg"
          ? "border-l-[3px] py-0.5 pl-4 text-2xl sm:text-[1.75rem]"
          : "border-l-2 py-px pl-3 text-lg",
        href && "transition-opacity hover:opacity-90",
        className
      )}
    >
      Invoice Generator
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex max-w-full min-w-0">
        {label}
      </Link>
    )
  }

  return label
}
