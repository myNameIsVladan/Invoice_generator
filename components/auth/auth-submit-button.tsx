import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AuthSubmitButtonProps = ComponentProps<typeof Button>

export function AuthSubmitButton({
  className,
  ...props
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      className={cn("h-10 w-full py-2.5", className)}
      {...props}
    />
  )
}
