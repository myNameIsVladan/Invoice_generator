"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { startTransition, useActionState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

import { signInAction, type AuthActionState } from "@/app/actions/auth"
import { signInSchema, type SignInInput } from "@/lib/auth/schemas"
import { AuthSubmitButton } from "@/components/auth/auth-submit-button"
import { FormAlert } from "@/components/auth/form-alert"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: AuthActionState = {}

export function SignInForm({ next }: { next?: string }) {
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })
  const [state, formAction, pending] = useActionState(signInAction, initialState)

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof SignInInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: SignInInput) {
    const data = new FormData()
    data.set("email", values.email)
    data.set("password", values.password)
    if (next) {
      data.set("next", next)
    }
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not sign in">
            {state.error}
          </FormAlert>
        ) : null}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
              <Input
                {...field}
                id="sign-in-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                {...field}
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>
      <AuthSubmitButton disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </AuthSubmitButton>
    </form>
  )
}
