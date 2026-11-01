import { formatCents, formatDecimal, formatIsoDate, formatQuantity } from "@/lib/invoice/format"
import { invoiceSenderName } from "@/lib/invoice/email"
import { partyLines, type InvoicePreviewModel } from "@/lib/invoice/model"
import { UNIT_LABELS } from "@/lib/invoice/schema"

function Party({ label, lines }: { label: string; lines: string[] }) {
  if (lines.length === 0) {
    return null
  }

  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
        {label}
      </p>
      {lines.map((line) => (
        <p key={line} className="whitespace-pre-line text-sm text-neutral-950">
          {line}
        </p>
      ))}
    </div>
  )
}

export function InvoicePreview({ model }: { model: InvoicePreviewModel }) {
  const senderName = invoiceSenderName(model.from.companyName, model.from.fullName)
  const comments = model.comments.trim()

  return (
    <article className="bg-white p-6 text-neutral-950 shadow-sm ring-1 ring-black/10 sm:p-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Invoice</h2>
        <p className="mt-1 text-sm">{senderName}</p>
      </header>

      <div className="mt-8 flex flex-col gap-6 sm:flex-row">
        <Party label="FROM" lines={partyLines(model.from, true)} />
        <Party label="TO" lines={model.to ? partyLines(model.to, false) : []} />
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
            INVOICE NUMBER
          </dt>
          <dd>{model.invoiceNumber ?? "Assigned on send"}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
            INVOICE DATE
          </dt>
          <dd>{model.invoiceDate ? formatIsoDate(model.invoiceDate) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
            DUE DATE
          </dt>
          <dd>{model.dueDate ? formatIsoDate(model.dueDate) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
            CURRENCY
          </dt>
          <dd>{model.currency}</dd>
        </div>
      </dl>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-neutral-950 text-xs">
            <tr>
              <th className="py-2 pr-3 font-semibold">Description</th>
              <th className="py-2 pr-3 text-right font-semibold">Qty</th>
              <th className="py-2 pr-3 text-right font-semibold">Unit</th>
              <th className="py-2 pr-3 text-right font-semibold">Price</th>
              <th className="py-2 pr-3 text-right font-semibold">VAT</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {model.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`} className="border-b border-neutral-200">
                <td className="py-2 pr-3">{line.description || "—"}</td>
                <td className="py-2 pr-3 text-right">
                  {line.quantity ? formatQuantity(line.quantity) : "—"}
                </td>
                <td className="py-2 pr-3 text-right">{UNIT_LABELS[line.unit]}</td>
                <td className="py-2 pr-3 text-right">
                  {line.unitPrice
                    ? formatDecimal(line.unitPrice, model.currency)
                    : "—"}
                </td>
                <td className="py-2 pr-3 text-right">
                  {line.vatRate ? `${formatQuantity(line.vatRate)}%` : "—"}
                </td>
                <td className="py-2 text-right">
                  {line.lineSubtotalCents == null
                    ? "—"
                    : formatCents(line.lineSubtotalCents, model.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>{formatCents(model.subtotalCents, model.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Tax</dt>
          <dd>{formatCents(model.taxCents, model.currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-neutral-950 pt-2 font-semibold">
          <dt>Total</dt>
          <dd>{formatCents(model.totalCents, model.currency)}</dd>
        </div>
      </dl>

      {comments ? (
        <div className="mt-8 space-y-1">
          <p className="text-[0.65rem] font-semibold tracking-widest text-neutral-500">
            COMMENTS
          </p>
          <p className="whitespace-pre-line text-sm">{comments}</p>
        </div>
      ) : null}
    </article>
  )
}
