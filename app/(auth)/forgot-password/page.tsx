import Link from "next/link"

import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="We will email you a link to choose a new password."
      footer={
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
