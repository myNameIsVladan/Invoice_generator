const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function decimalToCents(amount: string | number) {
  const raw = String(amount).trim()
  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [wholeRaw, fractionRaw = ""] = unsigned.split(".")
  const whole = wholeRaw.replace(/\D/g, "") || "0"
  const fraction = `${fractionRaw.replace(/\D/g, "")}00`.slice(0, 2)
  const cents = Number(`${whole}${fraction}`)
  return negative ? -cents : cents
}

export function formatQuantity(value: string | number) {
  const trimmed = String(value).trim()
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return trimmed
  }
  const [whole, fraction = ""] = trimmed.split(".")
  const kept = fraction.replace(/0+$/, "")
  return kept ? `${Number(whole)}.${kept}` : String(Number(whole))
}

function formatCentsParts(cents: number) {
  const negative = cents < 0
  const absolute = Math.abs(cents)
  const whole = Math.floor(absolute / 100)
  const fraction = String(absolute % 100).padStart(2, "0")
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${negative ? "-" : ""}${grouped}.${fraction}`
}

export function formatPlainCents(cents: number) {
  return formatCentsParts(cents)
}

export function formatCents(cents: number, currency: string) {
  return `${formatCentsParts(cents)} ${currency}`
}

export function formatDecimal(amount: string | number, currency: string) {
  const raw = String(amount).trim()
  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [wholeRaw, fractionRaw = ""] = unsigned.split(".")
  const whole = wholeRaw.replace(/\D/g, "") || "0"
  const fraction = `${fractionRaw.replace(/\D/g, "")}00`.slice(0, 2)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `${negative ? "-" : ""}${grouped}.${fraction} ${currency}`
}

/** `2026-10-31` becomes `31 Oct 2026`. */
export function formatIsoDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) {
    return iso
  }
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) {
    return iso
  }
  return `${Number(match[3])} ${month} ${match[1]}`
}

export function utcToday() {
  return new Date().toISOString().slice(0, 10)
}

export function addIsoDays(isoDate: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) {
    return isoDate
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
