"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { startTransition, useActionState, useEffect, useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import {
  createClientInlineAction,
  type ClientActionState,
} from "@/app/actions/clients"
import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { clientFormSchema, type ClientFormInput } from "@/lib/clients/schema"

const inlineClientSchema = clientFormSchema.superRefine((value, ctx) => {
  if (value.email.trim() === "") {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Enter an email address",
    })
  }
})

type InlineClientValues = z.infer<typeof inlineClientSchema>

const emptyClient: InlineClientValues = {
  full_name: "",
  company_name: "",
  email: "",
  address: "",
  vat_id: "",
}

const initialState: ClientActionState & { clientId?: number } = {}

export function AddClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (client: ClientFormInput & { id: number }) => void
}) {
  const form = useForm<InlineClientValues>({
    resolver: zodResolver(inlineClientSchema),
    defaultValues: emptyClient,
  })
  const [state, action, pending] = useActionState(
    createClientInlineAction,
    initialState
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && state.clientId && state.success) {
      onCreated({
        id: state.clientId,
        ...form.getValues(),
      })
      form.reset(emptyClient)
      onOpenChange(false)
    }
    wasPending.current = pending
  }, [form, onCreated, onOpenChange, pending, state.clientId, state.success])

  useEffect(() => {
    if (!state.fieldErrors) {
      return
    }
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      const message = messages?.[0]
      if (message) {
        form.setError(name as keyof InlineClientValues, { message })
      }
    }
  }, [form, state.fieldErrors])

  function onSubmit(values: InlineClientValues) {
    const data = new FormData()
    data.set("full_name", values.full_name)
    data.set("company_name", values.company_name)
    data.set("email", values.email)
    data.set("address", values.address)
    data.set("vat_id", values.vat_id)
    startTransition(() => {
      action(data)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>
            An email is required before this client can be invoiced.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {state.error ? (
            <FormAlert variant="destructive" title="Could not add client">
              {state.error}
            </FormAlert>
          ) : null}
          <FieldGroup>
            <Controller
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="inline-client-name">Full name</FieldLabel>
                  <Input {...field} id="inline-client-name" />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
            <Controller
              name="company_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="inline-client-company">Company name</FieldLabel>
                  <Input {...field} id="inline-client-company" />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="inline-client-email">Email</FieldLabel>
                  <Input {...field} id="inline-client-email" type="email" />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="inline-client-address">Address</FieldLabel>
                  <Textarea {...field} id="inline-client-address" rows={3} />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
            <Controller
              name="vat_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="inline-client-vat">VAT ID</FieldLabel>
                  <Input {...field} id="inline-client-vat" />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
