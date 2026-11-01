"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatIsoDate } from "@/lib/invoice/format"

function isoToLocalDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) {
    return undefined
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function localDateToIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function InvoiceDateField({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? isoToLocalDate(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-start px-3 py-3 font-normal"
            aria-invalid={invalid || undefined}
          />
        }
      >
        {value ? formatIsoDate(value) : "Choose a date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) {
              return
            }
            onChange(localDateToIso(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
