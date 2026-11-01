"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { startTransition, useActionState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

import {
  forgotPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/schemas"
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

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState
  )

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof ForgotPasswordInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: ForgotPasswordInput) {
    const data = new FormData()
    data.set("email", values.email)
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not send reset link">
            {state.error}
          </FormAlert>
        ) : null}
        {state.success ? (
          <FormAlert title="Check your email">{state.success}</FormAlert>
        ) : null}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
              <Input
                {...field}
                id="forgot-email"
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
      </FieldGroup>
      <AuthSubmitButton disabled={pending}>
        {pending ? "Sending link…" : "Send reset link"}
      </AuthSubmitButton>
    </form>
  )
}
