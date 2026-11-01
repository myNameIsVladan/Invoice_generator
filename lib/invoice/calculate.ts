import type { InvoiceUnit } from "@/lib/invoice/schema"

export type LineAmountsInput = {
  description: string
  quantity: string
  unit: InvoiceUnit
  unitPrice: string
  vatRate: string
}

export type CalculatedLine = LineAmountsInput & {
  lineSubtotalCents: number
  lineTaxCents: number
  lineTotalCents: number
}

export type CalculatedInvoice = {
  lines: CalculatedLine[]
  subtotalCents: number
  taxCents: number
  totalCents: number
}

const SCALED = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/
const ZERO = BigInt(0)
const TWO = BigInt(2)
const HUNDRED = BigInt(100)
const VAT_MAX = BigInt(10000)

export { ZERO, VAT_MAX }

/** Parse a non-negative decimal with at most two places into hundredths. */
export function parseScaled(value: string): bigint | null {
  const trimmed = value.trim()
  if (!SCALED.test(trimmed)) {
    return null
  }
  const [whole, fraction = ""] = trimmed.split(".")
  return BigInt(`${whole}${fraction.padEnd(2, "0")}`)
}

function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < ZERO
  const absolute = negative ? -numerator : numerator
  const quotient = absolute / denominator
  const remainder = absolute % denominator
  const rounded = remainder * TWO >= denominator ? quotient + BigInt(1) : quotient
  return negative ? -rounded : rounded
}

export function centsToDecimal(cents: number) {
  const negative = cents < 0
  const absolute = Math.abs(cents)
  const whole = Math.floor(absolute / 100)
  const fraction = String(absolute % 100).padStart(2, "0")
  return `${negative ? "-" : ""}${whole}.${fraction}`
}

export function calculateLine(input: LineAmountsInput): CalculatedLine | null {
  const quantity = parseScaled(input.quantity)
  const unitPrice = parseScaled(input.unitPrice)
  const vatRate = parseScaled(input.vatRate)
  if (quantity == null || unitPrice == null || vatRate == null) {
    return null
  }
  if (quantity <= ZERO || unitPrice < ZERO || vatRate < ZERO || vatRate > VAT_MAX) {
    return null
  }

  const lineSubtotal = roundDiv(quantity * unitPrice, HUNDRED)
  const lineTax = roundDiv(lineSubtotal * vatRate, VAT_MAX)
  const lineTotal = lineSubtotal + lineTax

  return {
    ...input,
    lineSubtotalCents: Number(lineSubtotal),
    lineTaxCents: Number(lineTax),
    lineTotalCents: Number(lineTotal),
  }
}

export function calculateInvoice(lines: LineAmountsInput[]): CalculatedInvoice | null {
  if (lines.length === 0) {
    return null
  }

  const calculated: CalculatedLine[] = []
  for (const line of lines) {
    const amounts = calculateLine(line)
    if (!amounts) {
      return null
    }
    calculated.push(amounts)
  }

  const subtotalCents = calculated.reduce(
    (sum, line) => sum + line.lineSubtotalCents,
    0
  )
  const taxCents = calculated.reduce((sum, line) => sum + line.lineTaxCents, 0)

  return {
    lines: calculated,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  }
}
