"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVerticalIcon } from "lucide-react"
import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  archiveClientAction,
  restoreClientAction,
  type ClientActionState,
} from "@/app/actions/clients"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const initialState: ClientActionState = {}

type ClientRowMenuProps = {
  clientId: number
  displayName: string
  isArchived: boolean
}

export function ClientRowMenu({
  clientId,
  displayName,
  isArchived,
}: ClientRowMenuProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveClientAction,
    initialState
  )
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreClientAction,
    initialState
  )
  const archiveWasPendingRef = useRef(false)
  const restoreWasPendingRef = useRef(false)

  useEffect(() => {
    if (archiveWasPendingRef.current && !archivePending) {
      if (archiveState.success === "archived") {
        toast.success("Client archived.")
        setArchiveOpen(false)
        router.refresh()
      } else if (archiveState.error) {
        toast.error(archiveState.error)
      }
    }
    archiveWasPendingRef.current = archivePending
  }, [archivePending, archiveState.error, archiveState.success, router])

  useEffect(() => {
    if (restoreWasPendingRef.current && !restorePending) {
      if (restoreState.success === "restored") {
        toast.success("Client restored.")
        router.refresh()
      } else if (restoreState.error) {
        toast.error(restoreState.error)
      }
    }
    restoreWasPendingRef.current = restorePending
  }, [restorePending, restoreState.error, restoreState.success, router])

  function submitArchive() {
    const data = new FormData()
    data.set("client_id", String(clientId))
    startTransition(() => {
      archiveAction(data)
    })
  }

  function submitRestore() {
    const data = new FormData()
    data.set("client_id", String(clientId))
    startTransition(() => {
      restoreAction(data)
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
              className="size-9 shrink-0 rounded-full text-muted-foreground"
              aria-label={`Actions for ${displayName}`}
            />
          }
        >
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem render={<Link href={`/clients/${clientId}`} />}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isArchived ? (
            <DropdownMenuItem
              disabled={restorePending}
              onClick={() => submitRestore()}
            >
              {restorePending ? "Restoring…" : "Restore"}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setArchiveOpen(true)}
            >
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived clients stay on invoices that already use them. They are
              hidden from the invoice picker until you restore them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={archivePending}
              onClick={submitArchive}
            >
              {archivePending ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
