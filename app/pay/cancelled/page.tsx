export default function PaymentCancelledPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Payment cancelled</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No payment was taken. You can use the link in the invoice email when you are ready.
      </p>
    </main>
  )
}
