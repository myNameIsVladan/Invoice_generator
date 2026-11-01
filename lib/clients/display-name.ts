export type ClientNameFields = {
  full_name: string | null
  company_name: string | null
}

export function clientDisplayName(client: ClientNameFields) {
  const company = client.company_name?.trim()
  const fullName = client.full_name?.trim()
  return company || fullName || "Unnamed client"
}
