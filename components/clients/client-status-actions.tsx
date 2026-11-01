"use client"

import { useRouter } from "next/navigation"
import { startTransition, useActionState, useEffect, useRef } from "react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const initialState: ClientActionState = {}

type ClientStatusActionsProps = {
  clientId: number
  displayName: string
  isArchived: boolean
}

export function ClientStatusActions({
  clientId,
  displayName,
  isArchived,
}: ClientStatusActionsProps) {
  const router = useRouter()
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
    <div className="space-y-4">
      <Separator />
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Status</h2>
        {isArchived ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              This client is archived and will not appear in the invoice picker.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={restorePending}
              onClick={submitRestore}
            >
              {restorePending ? "Restoring…" : "Restore client"}
            </Button>
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="destructive" disabled={archivePending} />
              }
            >
              {archivePending ? "Archiving…" : "Archive client"}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Archived clients stay on invoices that already use them. They
                  are hidden from the invoice picker until you restore them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={submitArchive}
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
