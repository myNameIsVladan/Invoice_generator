export function invoiceSenderName(
  companyName: string | null | undefined,
  fullName: string | null | undefined
) {
  const company = companyName?.trim()
  if (company) {
    return company
  }
  const name = fullName?.trim()
  if (name) {
    return name
  }
  return "Invoice"
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function buildInvoiceEmail(input: {
  invoiceNumber: string
  senderName: string
  note: string
  paymentUrl: string
}) {
  const subject = `Invoice ${input.invoiceNumber} from ${input.senderName}`
  const note = input.note.trim()
  const text = [
    "Hello,",
    "",
    `Please find invoice ${input.invoiceNumber} attached.`,
    "",
    ...(note ? [note, ""] : []),
    "You can pay it here:",
    input.paymentUrl,
    "",
    "Thank you,",
    input.senderName,
  ].join("\n")

  const noteHtml = note
    ? `<p>${escapeHtml(note).replaceAll("\n", "<br>")}</p>`
    : ""
  const html = [
    "<p>Hello,</p>",
    `<p>Please find invoice ${escapeHtml(input.invoiceNumber)} attached.</p>`,
    noteHtml,
    `<p>You can pay it here:<br><a href="${escapeHtml(input.paymentUrl)}">${escapeHtml(input.paymentUrl)}</a></p>`,
    `<p>Thank you,<br>${escapeHtml(input.senderName)}</p>`,
  ]
    .filter(Boolean)
    .join("")

  return { subject, text, html }
}
