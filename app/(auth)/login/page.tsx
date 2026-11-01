import Link from "next/link"

import { AuthSplitShell } from "@/components/auth/auth-split-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { isSafeConfirmNext } from "@/lib/auth/urls"

export const instant = false

type PageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  const safeNext = isSafeConfirmNext(next) ? next : undefined

  return (
    <AuthSplitShell
      title="Sign in"
      description="Enter your email and password to continue."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <SignInForm next={safeNext} />
    </AuthSplitShell>
  )
}
