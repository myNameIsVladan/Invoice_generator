import { BrandMark } from "@/components/app/brand-mark"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuthShellProps = {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center px-2 pb-2 text-center">
          <BrandMark />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
        {footer ? (
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
