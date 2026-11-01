export const instant = false

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Sender details for your invoices will be edited here. That screen is
          not built yet.
        </p>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Profile editing is coming soon. You will set the From block used on
        every new invoice.
      </div>
    </div>
  )
}
