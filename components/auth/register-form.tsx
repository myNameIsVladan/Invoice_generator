"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { startTransition, useActionState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

import { registerAction, type AuthActionState } from "@/app/actions/auth"
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas"
import { AuthSubmitButton } from "@/components/auth/auth-submit-button"
import { FormAlert } from "@/components/auth/form-alert"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: AuthActionState = {}

export function RegisterForm() {
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "" },
  })
  const [state, formAction, pending] = useActionState(registerAction, initialState)

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof RegisterInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: RegisterInput) {
    const data = new FormData()
    data.set("email", values.email)
    data.set("password", values.password)
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not create account">
            {state.error}
          </FormAlert>
        ) : null}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="register-email">Email</FieldLabel>
              <Input
                {...field}
                id="register-email"
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
              <FieldLabel htmlFor="register-password">Password</FieldLabel>
              <Input
                {...field}
                id="register-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>
      <AuthSubmitButton disabled={pending}>
        {pending ? "Signing up…" : "Sign up"}
      </AuthSubmitButton>
    </form>
  )
}
