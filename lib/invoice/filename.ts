const ID_WIDTH = 8

export function invoicePdfLocation(input: {
  userId: string
  invoiceId: number
  invoiceDate: string
  invoiceNumber: string
}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.invoiceDate)
  if (!match) {
    throw new Error("Invoice date must be YYYY-MM-DD")
  }

  const [, year, month, day] = match
  const id = String(input.invoiceId).padStart(ID_WIDTH, "0")
  const basename = `${year}-${month}-${day}_${id}_${input.invoiceNumber}.pdf`
  const path = `${input.userId}/${year}/${month}/${day}/${id}/${basename}`

  return { basename, path }
}
