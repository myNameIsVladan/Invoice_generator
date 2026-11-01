"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { startTransition, useActionState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

import { resetPasswordAction, type AuthActionState } from "@/app/actions/auth"
import {
  resetPasswordSchema,
  type ResetPasswordInput,
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

export function ResetPasswordForm() {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState
  )

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof ResetPasswordInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: ResetPasswordInput) {
    const data = new FormData()
    data.set("password", values.password)
    data.set("confirmPassword", values.confirmPassword)
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not reset password">
            {state.error}
          </FormAlert>
        ) : null}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <Input
                {...field}
                id="reset-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="reset-confirm-password">
                Confirm password
              </FieldLabel>
              <Input
                {...field}
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
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
        {pending ? "Saving…" : "Set new password"}
      </AuthSubmitButton>
    </form>
  )
}
