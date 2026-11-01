import { formatPlainCents } from "@/lib/invoice/format"

export function InvoiceFormTotals({
  subtotalCents,
  taxCents,
  totalCents,
}: {
  subtotalCents: number
  taxCents: number
  totalCents: number
}) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/45 px-4 py-4 text-sm text-foreground">
      <div className="flex items-center justify-between gap-4">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatPlainCents(subtotalCents)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span>Tax</span>
        <span className="tabular-nums">{formatPlainCents(taxCents)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPlainCents(totalCents)}</span>
      </div>
    </div>
  )
}
