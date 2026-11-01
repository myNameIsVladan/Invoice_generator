"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import {
  createInvoiceAction,
  editInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices"
import { AddClientDialog } from "@/components/invoices/add-client-dialog"
import { InvoiceDateField } from "@/components/invoices/invoice-date-field"
import { InvoiceFormTotals } from "@/components/invoices/invoice-form-totals"
import { InvoicePreview } from "@/components/invoices/invoice-preview"
import { FormAlert } from "@/components/auth/form-alert"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { clientDisplayName } from "@/lib/clients/display-name"
import { addIsoDays } from "@/lib/invoice/format"
import { buildPreviewModel, type InvoiceParty } from "@/lib/invoice/model"
import {
  UNIT_LABELS,
  emptyInvoiceLine,
  invoiceCurrencies,
  invoiceFormSchema,
  invoiceUnits,
  type InvoiceFormValues,
} from "@/lib/invoice/schema"
import { cn } from "cn"

export type InvoiceClientChoice = {
  id: number
  fullName: string | null
  companyName: string | null
  email: string
  address: string | null
  vatId: string | null
}

const initialState: InvoiceActionState = {}

const lineItemControlClass = "ml-1"
const lineItemInputClass = cn(lineItemControlClass)
const lineItemSelectClass = cn(lineItemControlClass, "w-full")

function applyFieldErrors(
  form: ReturnType<typeof useForm<InvoiceFormValues>>,
  fieldErrors: Record<string, string[] | undefined> | undefined
) {
  if (!fieldErrors) {
    return
  }
  for (const [name, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0]
    if (message) {
      form.setError(name as keyof InvoiceFormValues, { message })
    }
  }
}

export function InvoiceForm({
  mode,
  invoiceId,
  sender,
  clients,
  defaultValues,
  canCreate,
  invoiceNumber,
}: {
  mode: "create" | "edit"
  invoiceId?: number
  sender: InvoiceParty
  clients: InvoiceClientChoice[]
  defaultValues: InvoiceFormValues
  canCreate: boolean
  invoiceNumber?: string | null
}) {
  const router = useRouter()
  const action = mode === "create" ? createInvoiceAction : editInvoiceAction
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  })
  const lines = useFieldArray({ control: form.control, name: "lines" })
  const [state, formAction, pending] = useActionState(action, initialState)
  const [clientChoices, setClientChoices] = useState(clients)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [failureDismissed, setFailureDismissed] = useState(false)
  const wasPending = useRef(false)
  const values = useWatch({ control: form.control })

  useEffect(() => {
    applyFieldErrors(form, state.fieldErrors)
  }, [form, state.fieldErrors])

  useEffect(() => {
    if (!wasPending.current || pending) {
      wasPending.current = pending
      return
    }
    if (mode === "create" && state.sendStatus === "sent" && state.invoiceId) {
      const today = new Date().toISOString().slice(0, 10)
      form.reset({
        client_id: "",
        invoice_date: today,
        due_date: addIsoDays(today, 14),
        currency: "EUR",
        comments: "",
        note: "",
        lines: [emptyInvoiceLine()],
      })
      toast.success("Invoice sent", {
        action: {
          label: "View invoice",
          onClick: () => router.push(`/invoices/${state.invoiceId}`),
        },
      })
    }
    wasPending.current = pending
  }, [form, mode, pending, router, state.invoiceId, state.sendStatus])

  const selectedClient = clientChoices.find(
    (client) => String(client.id) === values.client_id
  )
  const preview = useMemo(
    () =>
      buildPreviewModel({
        invoiceNumber: invoiceNumber ?? null,
        invoiceDate: values.invoice_date ?? "",
        dueDate: values.due_date ?? "",
        currency: values.currency ?? "EUR",
        comments: values.comments ?? "",
        from: sender,
        to: selectedClient
          ? {
              fullName: selectedClient.fullName,
              companyName: selectedClient.companyName,
              email: selectedClient.email,
              address: selectedClient.address,
              vatId: selectedClient.vatId,
            }
          : null,
        lines: (values.lines ?? []).map((line) => ({
          description: line?.description ?? "",
          quantity: line?.quantity ?? "",
          unit: line?.unit ?? "hours",
          unitPrice: line?.unit_price ?? "",
          vatRate: line?.vat_rate ?? "",
        })),
      }),
    [invoiceNumber, selectedClient, sender, values]
  )

  const sendFailed =
    mode === "create" && state.sendStatus === "failed" && !failureDismissed

  function onSubmit(payload: InvoiceFormValues) {
    if (!canCreate) {
      return
    }
    setFailureDismissed(false)
    const data = new FormData()
    if (invoiceId != null) {
      data.set("invoice_id", String(invoiceId))
    }
    data.set("payload", JSON.stringify(payload))
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
        <input type="hidden" {...form.register("note")} />
        {!canCreate ? (
          <FormAlert variant="destructive" title="Create is unavailable">
            Add a full name or a company name on your{" "}
            <Link href="/profile" className="underline underline-offset-3">
              profile
            </Link>{" "}
            before sending an invoice.
          </FormAlert>
        ) : null}
        {state.error && state.sendStatus !== "failed" ? (
          <FormAlert variant="destructive" title="Could not save the invoice">
            {state.error}
          </FormAlert>
        ) : null}
        {state.sendStatus === "sent" && state.invoiceId ? (
          <FormAlert title="Invoice sent">
            <Link href={`/invoices/${state.invoiceId}`} className="underline underline-offset-3">
              View the invoice
            </Link>
          </FormAlert>
        ) : null}
        {sendFailed && state.invoiceId ? (
          <FormAlert variant="destructive" title="Send failed">
            {state.error} The invoice is saved and the payment link works.{" "}
            <Link href={`/invoices/${state.invoiceId}`} className="underline underline-offset-3">
              Open it to retry
            </Link>
            .
          </FormAlert>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel>From</FieldLabel>
            <div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
              <p className="font-medium">
                {sender.companyName?.trim() || sender.fullName?.trim() || "No sender name yet"}
              </p>
              <p className="text-muted-foreground">
                Taken from your profile when the invoice is created.
              </p>
            </div>
          </Field>

          <Controller
            name="client_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="invoice-client">To</FieldLabel>
                <div className="flex flex-col gap-2">
                  <Select
                    value={field.value || null}
                    onValueChange={(next) => field.onChange(next ?? "")}
                  >
                    <SelectTrigger
                      id="invoice-client"
                      className="w-full"
                      aria-invalid={fieldState.invalid || undefined}
                    >
                      <SelectValue placeholder="Choose a client">
                        {field.value && selectedClient
                          ? clientDisplayName({
                              full_name: selectedClient.fullName,
                              company_name: selectedClient.companyName,
                            })
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent side="bottom" sideOffset={4}>
                      {clientChoices.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {clientDisplayName({
                            full_name: client.fullName,
                            company_name: client.companyName,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full px-3 py-3 sm:w-auto"
                    onClick={() => setAddClientOpen(true)}
                  >
                    Add client
                  </Button>
                </div>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="invoice_date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="invoice-date">Invoice date</FieldLabel>
                  <InvoiceDateField
                    id="invoice-date"
                    value={field.value}
                    invalid={fieldState.invalid}
                    onChange={(next) => {
                      field.onChange(next)
                      const due = form.getValues("due_date")
                      if (due < next) {
                        form.setValue("due_date", next)
                      }
                    }}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
            <Controller
              name="due_date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="due-date">Due date</FieldLabel>
                  <InvoiceDateField
                    id="due-date"
                    value={field.value}
                    invalid={fieldState.invalid}
                    onChange={field.onChange}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </div>

          <Controller
            name="currency"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="invoice-currency">Currency</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invoice-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" sideOffset={4}>
                    {invoiceCurrencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
        </FieldGroup>

        <Field className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <FieldTitle>Line items</FieldTitle>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => lines.append(emptyInvoiceLine())}
            >
              Add line
            </Button>
          </div>
          <div className="flex flex-col gap-3">
          {lines.fields.map((line, index) => (
            <div key={line.id} className="space-y-3 rounded-xl bg-muted/30 px-4 py-6">
              <Controller
                name={`lines.${index}.description`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor={`line-description-${index}`}>Description</FieldLabel>
                    <Input {...field} id={`line-description-${index}`} className={lineItemInputClass} />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Controller
                  name={`lines.${index}.quantity`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={`line-quantity-${index}`}>Quantity</FieldLabel>
                      <Input
                        {...field}
                        id={`line-quantity-${index}`}
                        inputMode="decimal"
                        className={lineItemInputClass}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Controller
                  name={`lines.${index}.unit`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={`line-unit-${index}`}>Unit</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id={`line-unit-${index}`}
                          size="input"
                          className={lineItemSelectClass}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="bottom" sideOffset={4}>
                          {invoiceUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {UNIT_LABELS[unit]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Controller
                  name={`lines.${index}.unit_price`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={`line-price-${index}`}>Price</FieldLabel>
                      <Input
                        {...field}
                        id={`line-price-${index}`}
                        inputMode="decimal"
                        className={lineItemInputClass}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Controller
                  name={`lines.${index}.vat_rate`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={`line-vat-${index}`}>VAT %</FieldLabel>
                      <Input
                        {...field}
                        id={`line-vat-${index}`}
                        inputMode="decimal"
                        className={lineItemInputClass}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </div>
              {lines.fields.length > 1 ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => lines.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
          {form.formState.errors.lines?.message ? (
            <FieldError errors={[{ message: form.formState.errors.lines.message }]} />
          ) : null}
          {form.formState.errors.lines?.root?.message ? (
            <FieldError errors={[{ message: form.formState.errors.lines.root.message }]} />
          ) : null}
          <InvoiceFormTotals
            subtotalCents={preview.subtotalCents}
            taxCents={preview.taxCents}
            totalCents={preview.totalCents}
          />
          </div>
        </Field>

        <Controller
          name="comments"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="invoice-comments">Comments</FieldLabel>
              <Textarea
                {...field}
                id="invoice-comments"
                rows={5}
                className="min-h-32 py-2.5"
              />
              <p className="text-sm text-muted-foreground">Printed on the invoice.</p>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />

        <div className="flex flex-wrap items-center gap-3">
          {sendFailed ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10)
                form.reset({
                  client_id: "",
                  invoice_date: today,
                  due_date: addIsoDays(today, 14),
                  currency: "EUR",
                  comments: "",
                  note: "",
                  lines: [emptyInvoiceLine()],
                })
                setFailureDismissed(true)
              }}
            >
              Start another invoice
            </Button>
          ) : (
            <Button type="submit" disabled={pending || !canCreate}>
              {pending ? "Saving…" : "Save invoice"}
            </Button>
          )}
          <Link
            href={mode === "edit" && invoiceId ? `/invoices/${invoiceId}` : "/invoices"}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancel
          </Link>
        </div>
      </form>

      <div className="lg:sticky lg:top-6">
        <InvoicePreview model={preview} />
      </div>

      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onCreated={(client) => {
          const choice: InvoiceClientChoice = {
            id: client.id,
            fullName: client.full_name,
            companyName: client.company_name,
            email: client.email.trim(),
            address: client.address,
            vatId: client.vat_id,
          }
          setClientChoices((current) => [...current, choice])
          form.setValue("client_id", String(client.id), { shouldValidate: true })
        }}
      />
    </div>
  )
}
