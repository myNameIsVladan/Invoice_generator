"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/actions/profile"
import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  profileFormSchema,
  type ProfileFormInput,
} from "@/lib/profile/schema"

const initialState: ProfileActionState = {}

type ProfileFormProps = {
  accountEmail: string
  defaultValues: ProfileFormInput
}

export function ProfileForm({ accountEmail, defaultValues }: ProfileFormProps) {
  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  })
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const wasPendingRef = useRef(false)

  useEffect(() => {
    setSuccessMessage(null)
  }, [])

  useEffect(() => {
    if (wasPendingRef.current && !pending && state.success) {
      setSuccessMessage(state.success)
    }
    wasPendingRef.current = pending
  }, [pending, state.success])

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof ProfileFormInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: ProfileFormInput) {
    setSuccessMessage(null)
    const data = new FormData()
    data.set("full_name", values.full_name)
    data.set("company_name", values.company_name)
    data.set("email", values.email)
    data.set("address", values.address)
    data.set("vat_id", values.vat_id)
    data.set("website", values.website)
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not save profile">
            {state.error}
          </FormAlert>
        ) : null}
        {successMessage ? (
          <FormAlert title="Saved">{successMessage}</FormAlert>
        ) : null}

        <Field>
          <FieldLabel htmlFor="profile-account-email">Account email</FieldLabel>
          <Input
            id="profile-account-email"
            type="email"
            value={accountEmail}
            disabled
            aria-disabled="true"
          />
          <FieldDescription>
            The email you use to sign in. Contact support if you need to change
            it.
          </FieldDescription>
        </Field>

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-reply-to-email">
                Invoice reply-to email
              </FieldLabel>
              <Input
                {...field}
                id="profile-reply-to-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldDescription>
                Where client replies to invoice emails are delivered. Starts as
                your account email; change it only if you want replies sent
                elsewhere.
              </FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="full_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-full-name">Full name</FieldLabel>
              <Input
                {...field}
                id="profile-full-name"
                autoComplete="name"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="company_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-company-name">Company name</FieldLabel>
              <Input
                {...field}
                id="profile-company-name"
                autoComplete="organization"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-address">Address</FieldLabel>
              <Textarea
                {...field}
                id="profile-address"
                autoComplete="street-address"
                rows={3}
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="vat_id"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-vat-id">VAT ID</FieldLabel>
              <Input
                {...field}
                id="profile-vat-id"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />

        <Controller
          name="website"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="profile-website">Website</FieldLabel>
              <Input
                {...field}
                id="profile-website"
                type="url"
                autoComplete="url"
                placeholder="https://example.com"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldDescription>Include https://</FieldDescription>
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  )
}
