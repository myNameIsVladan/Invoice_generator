export const appNavItems = [
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/profile", label: "Profile" },
] as const

export type AppNavHref = (typeof appNavItems)[number]["href"]

export function isNavItemActive(pathname: string, href: AppNavHref) {
  if (href === "/invoices") {
    return pathname === "/invoices" || pathname.startsWith("/invoices/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
