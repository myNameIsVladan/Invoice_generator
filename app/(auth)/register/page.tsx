import Link from "next/link"

import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthSplitShell
      title="Sign up"
      description="Enter your email and password to create your account."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthSplitShell>
  )
}
