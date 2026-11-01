import type { ClientListStatus } from "@/lib/clients/schema"

export function clientsListHref(status: ClientListStatus, query: string) {
  const params = new URLSearchParams()
  const trimmed = query.trim()
  if (trimmed !== "") {
    params.set("q", trimmed)
  }
  if (status !== "all") {
    params.set("status", status)
  }
  const serialized = params.toString()
  return serialized === "" ? "/clients" : `/clients?${serialized}`
}
