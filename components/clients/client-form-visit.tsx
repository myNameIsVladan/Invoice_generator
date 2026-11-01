"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"

import { ClientForm, type ClientFormProps } from "@/components/clients/client-form"

function nextEditVisitKey(pathname: string) {
  if (typeof window === "undefined") {
    return 0
  }

  const storageKey = `client-edit-visit:${pathname}`
  const next = Number(window.sessionStorage.getItem(storageKey) ?? "0") + 1
  window.sessionStorage.setItem(storageKey, String(next))
  return next
}

type ClientEditFormProps = Omit<ClientFormProps, "mode"> & {
  clientId: number
}

export function ClientEditForm(props: ClientEditFormProps) {
  const pathname = usePathname()
  const [visitKey] = useState(() => nextEditVisitKey(pathname))

  return (
    <ClientForm
      key={`${pathname}-${visitKey}`}
      mode="edit"
      {...props}
    />
  )
}
