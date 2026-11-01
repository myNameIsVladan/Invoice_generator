import { z } from "zod"

import { calculateInvoice, parseScaled, VAT_MAX, ZERO } from "@/lib/invoice/calculate"

export const invoiceUnits = ["hours", "days", "pieces", "flat"] as const
export const invoiceCurrencies = ["EUR", "USD", "GBP"] as const

export type InvoiceUnit = (typeof invoiceUnits)[number]
export type InvoiceCurrency = (typeof invoiceCurrencies)[number]

export const UNIT_LABELS: Record<InvoiceUnit, string> = {
  hours: "Hours",
  days: "Days",
  pieces: "Pieces",
  flat: "Flat",
}

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")

function scaledField(message: string, check: (value: bigint) => boolean) {
  return z.string().trim().refine((value) => {
    const scaled = parseScaled(value)
    return scaled != null && check(scaled)
  }, message)
}

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Enter a description"),
  quantity: scaledField(
    "Quantity must be greater than zero, with at most two decimal places",
    (value) => value > ZERO
  ),
  unit: z.enum(invoiceUnits, { message: "Choose Hours, Days, Pieces, or Flat" }),
  unit_price: scaledField(
    "Price must be zero or greater, with at most two decimal places",
    (value) => value >= ZERO
  ),
  vat_rate: scaledField(
    "VAT must be from 0 through 100, with at most two decimal places",
    (value) => value >= ZERO && value <= VAT_MAX
  ),
})

export const invoiceFormSchema = z
  .object({
    client_id: z.string().trim().min(1, "Choose a client"),
    invoice_date: isoDate,
    due_date: isoDate,
    currency: z.enum(invoiceCurrencies, {
      message: "Currency must be EUR, USD, or GBP",
    }),
    comments: z.string(),
    note: z.string(),
    lines: z.array(invoiceLineSchema).min(1, "Add a line"),
  })
  .superRefine((value, ctx) => {
    if (value.due_date < value.invoice_date) {
      ctx.addIssue({
        code: "custom",
        path: ["due_date"],
        message: "Due date must be on or after the invoice date",
      })
    }

    const totals = calculateInvoice(
      value.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unit_price,
        vatRate: line.vat_rate,
      }))
    )

    if (totals && totals.totalCents <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["lines"],
        message: "Total must be greater than zero",
      })
    }
  })

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export type InvoiceListFilter = "all" | "not_paid" | "paid" | "overdue"

export function parseInvoiceListFilter(
  value: string | string[] | undefined
): InvoiceListFilter {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "not_paid" || raw === "paid" || raw === "overdue") {
    return raw
  }
  return "all"
}

export function parseInvoiceSearchQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === "string" ? raw : ""
}

export function parseInvoicePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number(raw)
  if (!Number.isInteger(page) || page < 1) {
    return 1
  }
  return page
}

export function emptyInvoiceLine(): InvoiceFormValues["lines"][number] {
  return {
    description: "",
    quantity: "1",
    unit: "hours",
    unit_price: "",
    vat_rate: "0",
  }
}

export const PAGE_SIZE = 20
