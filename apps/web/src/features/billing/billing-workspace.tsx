import { CreditCardIcon } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";
import { cn } from "@/src/lib/utils";
import { mockBilling, type BillingPlan } from "./mock-billing";

function PlanCard({ plan }: { plan: BillingPlan }) {
  return (
    <Card className={cn("gap-4", plan.current && "border-accent")}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {plan.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {plan.creditsPerMonth} credits/mo · {plan.storageInGb} GB ·{" "}
              {plan.members} {plan.members === 1 ? "seat" : "seats"}
            </p>
          </div>
          {plan.current ? (
            <Badge variant="accent">Current plan</Badge>
          ) : (
            <Badge variant="outline">Available</Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <strong className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            €{plan.monthlyPriceInEuro}
          </strong>
          <span className="text-xs text-muted-foreground">/ month</span>
        </div>
        <Button
          disabled
          size="sm"
          title="Plan changes aren't available yet"
          variant={plan.current ? "outline" : "secondary"}
        >
          {plan.current ? "Current plan" : "Switch plan"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function BillingWorkspace() {
  const { notice, creditBalance, plans, invoices, paymentMethod } =
    mockBilling;

  return (
    <main className="mx-auto w-full max-w-[720px] px-5.5 py-8.5 pb-14">
      <header className="mb-5.5">
        <p className="mb-2 text-[10.5px] font-medium tracking-wider text-muted-foreground uppercase">
          Plans &amp; payments
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Billing
        </h1>
      </header>

      <p
        className="mb-5.5 rounded-control border border-border bg-secondary px-3.5 py-2.5 font-mono text-[11px] leading-[1.5] text-muted-foreground"
        role="status"
      >
        MVP demo · {notice}
      </p>

      <section aria-labelledby="billing-plans-heading" className="mb-6">
        <h2
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          id="billing-plans-heading"
        >
          Plan · {creditBalance} credits this cycle
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section aria-labelledby="billing-payment-method-heading" className="mb-6">
        <h2
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          id="billing-payment-method-heading"
        >
          Payment method
        </h2>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-control bg-secondary text-muted-foreground"
              >
                <CreditCardIcon className="size-[18px]" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {paymentMethod.brand} •••• {paymentMethod.lastFour}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {paymentMethod.expires} · synthetic, not charged
                </p>
              </div>
            </div>
            <Button
              disabled
              size="sm"
              title="Payment methods aren't available yet"
              variant="outline"
            >
              Update
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="billing-invoices-heading">
        <h2
          className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          id="billing-invoices-heading"
        >
          Invoices
        </h2>
        <Card className="gap-0 overflow-hidden py-0">
          {invoices.map((invoice, index) => (
            <div key={invoice.id}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {invoice.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.issuedOn}
                  </p>
                </div>
                <span className="font-mono text-sm font-medium whitespace-nowrap text-foreground tabular-nums">
                  €{invoice.amountInEuro}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </main>
  );
}
