import { connectStripeAction } from "@/app/actions/stripe"
import { FormAlert } from "@/components/auth/form-alert"
import { Button } from "@/components/ui/button"

export function StripeConnect({
  chargesEnabled,
  notice,
}: {
  chargesEnabled: boolean
  notice: "ready" | "incomplete" | "error" | null
}) {
  return (
    <section className="space-y-3 rounded-xl bg-muted/30 px-4 py-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Stripe</h2>
        <p className="text-sm text-muted-foreground">
          {chargesEnabled
            ? "Stripe is connected. Invoices you send include a payment link."
            : "Connect Stripe before a client can pay an invoice online. You can also connect the first time you send an invoice."}
        </p>
      </div>
      {notice === "ready" ? (
        <FormAlert title="Stripe connected">Charges are enabled on this account.</FormAlert>
      ) : null}
      {notice === "incomplete" ? (
        <FormAlert title="Stripe onboarding is not finished">
          Finish Connect when you want to send a payment link.
        </FormAlert>
      ) : null}
      {notice === "error" ? (
        <FormAlert variant="destructive" title="Stripe could not be updated">
          Try connecting again.
        </FormAlert>
      ) : null}
      {chargesEnabled ? null : (
        <form action={connectStripeAction}>
          <Button type="submit">Connect Stripe</Button>
        </form>
      )}
    </section>
  )
}
