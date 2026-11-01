export const instant = false

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Your invoice list will appear here. That screen is not built yet.
        </p>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No invoices yet. Once the list is implemented, your newest invoices will
        show up here.
      </div>
    </div>
  )
}
