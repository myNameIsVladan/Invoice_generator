"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react"
import { Controller, useForm } from "react-hook-form"

import {
  createClientAction,
  updateClientAction,
  type ClientActionState,
} from "@/app/actions/clients"
import { FormAlert } from "@/components/auth/form-alert"
import { Button, buttonVariants } from "@/components/ui/button"
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
  clientFormSchema,
  type ClientFormInput,
} from "@/lib/clients/schema"

const initialState: ClientActionState = {}

export type ClientFormProps = {
  mode: "create" | "edit"
  defaultValues: ClientFormInput
  clientId?: number
}

export function ClientForm({ mode, defaultValues, clientId }: ClientFormProps) {
  const action = mode === "create" ? createClientAction : updateClientAction
  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
  })
  const [state, formAction, pending] = useActionState(action, initialState)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const wasPendingRef = useRef(false)

  useEffect(() => {
    if (wasPendingRef.current && !pending && state.success && mode === "edit") {
      setSuccessMessage(state.success)
    }
    wasPendingRef.current = pending
  }, [mode, pending, state.success])

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }

    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof ClientFormInput, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: ClientFormInput) {
    setSuccessMessage(null)
    const data = new FormData()
    if (mode === "edit" && clientId != null) {
      data.set("client_id", String(clientId))
    }
    data.set("full_name", values.full_name)
    data.set("company_name", values.company_name)
    data.set("email", values.email)
    data.set("address", values.address)
    data.set("vat_id", values.vat_id)
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FieldGroup>
        {state.error ? (
          <FormAlert variant="destructive" title="Could not save client">
            {state.error}
          </FormAlert>
        ) : null}
        {successMessage ? (
          <FormAlert title="Saved">{successMessage}</FormAlert>
        ) : null}

        <Controller
          name="full_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="client-full-name">Full name</FieldLabel>
              <Input
                {...field}
                id="client-full-name"
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
              <FieldLabel htmlFor="client-company-name">Company name</FieldLabel>
              <Input
                {...field}
                id="client-company-name"
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
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="client-email">Email</FieldLabel>
              <Input
                {...field}
                id="client-email"
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldDescription>
                Required before this client can be added to an invoice. You can
                save without one for now.
              </FieldDescription>
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
              <FieldLabel htmlFor="client-address">Address</FieldLabel>
              <Textarea
                {...field}
                id="client-address"
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
              <FieldLabel htmlFor="client-vat-id">VAT ID</FieldLabel>
              <Input
                {...field}
                id="client-vat-id"
                aria-invalid={fieldState.invalid || undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : null}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Add client"
              : "Save client"}
        </Button>
        <Link
          href="/clients"
          className={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
