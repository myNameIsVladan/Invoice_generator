export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Payment received</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Thank you. The invoice is marked paid once Stripe confirms the payment.
      </p>
    </main>
  )
}
