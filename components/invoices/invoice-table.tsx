"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVerticalIcon } from "lucide-react"
import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { deleteInvoiceAction, type InvoiceActionState } from "@/app/actions/invoices"
import { ResendInvoiceDialog } from "@/components/invoices/resend-invoice-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type InvoiceListItem = {
  id: number
  invoiceNumber: string
  clientName: string
  invoiceDate: string
  dueDate: string
  totalLabel: string
  status: "not_paid" | "paid"
  overdue: boolean
  alreadySent: boolean
}

const initialState: InvoiceActionState = {}

function InvoiceRowMenu({ item }: { item: InvoiceListItem }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [resendOpen, setResendOpen] = useState(false)
  const [state, action, pending] = useActionState(deleteInvoiceAction, initialState)
  const wasPending = useRef(false)
  const canChange = item.status === "not_paid"

  useEffect(() => {
    if (wasPending.current && !pending) {
      if (state.success === "deleted") {
        toast.success("Invoice deleted.")
        router.refresh()
      } else if (state.error) {
        toast.error(state.error)
      }
    }
    wasPending.current = pending
  }, [pending, router, state.error, state.success])

  function confirmDelete() {
    setDeleteOpen(false)
    const data = new FormData()
    data.set("invoice_id", String(item.id))
    data.set("stay", "1")
    startTransition(() => {
      action(data)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label={`Actions for ${item.invoiceNumber}`}
            />
          }
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canChange ? (
            <DropdownMenuItem render={<Link href={`/invoices/${item.id}/edit`} />}>
              Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => setResendOpen(true)}>
            {item.alreadySent ? "Resend" : "Send"}
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href={`/invoices/${item.id}/pdf`} />}>
            Download PDF
          </DropdownMenuItem>
          {canChange ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ResendInvoiceDialog
        invoiceId={item.id}
        invoiceNumber={item.invoiceNumber}
        open={resendOpen}
        onOpenChange={setResendOpen}
        alreadySent={item.alreadySent}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {item.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment link stops working and the invoice is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={confirmDelete}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function InvoiceTable({ rows }: { rows: InvoiceListItem[] }) {
  const router = useRouter()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Invoice date</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => router.push(`/invoices/${row.id}`)}
          >
            <TableCell className="font-medium">
              <Link
                href={`/invoices/${row.id}`}
                className="underline-offset-3 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {row.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell>{row.clientName}</TableCell>
            <TableCell>{row.invoiceDate}</TableCell>
            <TableCell>{row.dueDate}</TableCell>
            <TableCell>{row.totalLabel}</TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant={row.status === "paid" ? "secondary" : "outline"}>
                  {row.status === "paid" ? "Paid" : "Not paid"}
                </Badge>
                {row.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
              </div>
            </TableCell>
            <TableCell onClick={(event) => event.stopPropagation()}>
              <InvoiceRowMenu item={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
