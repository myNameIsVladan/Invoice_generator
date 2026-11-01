import { calculateLine } from "@/lib/invoice/calculate"
import { decimalToCents } from "@/lib/invoice/format"
import type { InvoiceCurrency, InvoiceUnit } from "@/lib/invoice/schema"

export type InvoiceParty = {
  fullName: string | null
  companyName: string | null
  email: string | null
  address: string | null
  vatId: string | null
  website?: string | null
}

export type InvoicePreviewLine = {
  description: string
  quantity: string
  unit: InvoiceUnit
  unitPrice: string
  vatRate: string
  lineSubtotalCents: number | null
  lineTaxCents: number | null
  lineTotalCents: number | null
}

export type InvoicePreviewModel = {
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string
  currency: InvoiceCurrency
  comments: string
  from: InvoiceParty
  to: InvoiceParty | null
  lines: InvoicePreviewLine[]
  subtotalCents: number
  taxCents: number
  totalCents: number
}

export function presentText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function partyLines(party: InvoiceParty, includeWebsite: boolean) {
  const lines = [
    presentText(party.companyName),
    presentText(party.fullName),
    presentText(party.email),
    presentText(party.address),
    presentText(party.vatId) ? `VAT ${presentText(party.vatId)}` : null,
    includeWebsite ? presentText(party.website) : null,
  ]
  return lines.filter((line): line is string => Boolean(line))
}

export function buildPreviewModel(input: {
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string
  currency: InvoiceCurrency
  comments: string
  from: InvoiceParty
  to: InvoiceParty | null
  lines: Array<{
    description: string
    quantity: string
    unit: InvoiceUnit
    unitPrice: string
    vatRate: string
  }>
}): InvoicePreviewModel {
  const lines = input.lines.map((line) => {
    const amounts = calculateLine({
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    })
    return {
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
      lineSubtotalCents: amounts?.lineSubtotalCents ?? null,
      lineTaxCents: amounts?.lineTaxCents ?? null,
      lineTotalCents: amounts?.lineTotalCents ?? null,
    }
  })

  const subtotalCents = lines.reduce(
    (sum, line) => sum + (line.lineSubtotalCents ?? 0),
    0
  )
  const taxCents = lines.reduce((sum, line) => sum + (line.lineTaxCents ?? 0), 0)

  return {
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    currency: input.currency,
    comments: input.comments,
    from: input.from,
    to: input.to,
    lines,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  }
}

export function centsFromDecimal(amount: string | number) {
  return decimalToCents(amount)
}
