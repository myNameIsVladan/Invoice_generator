import Link from "next/link"

import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      description="Choose a new password for your account."
      footer={
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  )
}
