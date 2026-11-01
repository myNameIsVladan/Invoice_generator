import { connection } from "next/server"

import { ClientForm } from "@/components/clients/client-form"
import { clientRowToFormValues } from "@/lib/clients/schema"

export const instant = false

export default async function NewClientPage() {
  await connection()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add client</h1>
        <p className="text-sm text-muted-foreground">
          Save client details now. You can add an email later if you are not
          ready to invoice them yet.
        </p>
      </div>

      <ClientForm
        mode="create"
        defaultValues={clientRowToFormValues({
          full_name: null,
          company_name: null,
          email: null,
          address: null,
          vat_id: null,
        })}
      />
    </div>
  )
}
