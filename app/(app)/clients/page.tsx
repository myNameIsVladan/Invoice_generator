export const instant = false

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          Your client list will appear here. That screen is not built yet.
        </p>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No clients yet. Once client management is implemented, you will add,
        edit, and archive clients here.
      </div>
    </div>
  )
}
