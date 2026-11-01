import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type FormAlertProps = {
  variant?: "default" | "destructive"
  title: string
  children: React.ReactNode
}

export function FormAlert({
  variant = "default",
  title,
  children,
}: FormAlertProps) {
  const Icon = variant === "destructive" ? CircleAlertIcon : CircleCheckIcon

  return (
    <Alert variant={variant}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
